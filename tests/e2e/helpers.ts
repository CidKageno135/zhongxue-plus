import { expect, type Page } from '@playwright/test';

/**
 * Robust semantic navigation helper for ZhongXue+
 * Disambiguates between Desktop Topbar and Mobile Sidebar Drawer
 * without using arbitrary `.first()` calls.
 */
export async function navigate(page: Page, name: string) {
  await expect(page.getByRole('main')).toBeVisible();

  const mobileDrawer = page.locator('aside.bento-mobile-drawer');
  const menuBtn = page.locator('header.bento-header').getByRole('button', { name: 'Mở menu', exact: true });

  const isDrawerAlreadyOpen = await mobileDrawer.isVisible();
  const isMenuBtnVisible = await menuBtn.isVisible();

  if (isDrawerAlreadyOpen) {
    // Drawer is already open on mobile, click directly inside drawer navigation
    const mobileNav = mobileDrawer.getByRole('navigation', { name: 'Điều hướng chính' });
    await mobileNav.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  } else if (isMenuBtnVisible) {
    // Mobile viewport with collapsed drawer: open menu first
    await menuBtn.click();
    await expect(mobileDrawer).toBeVisible();
    const mobileNav = mobileDrawer.getByRole('navigation', { name: 'Điều hướng chính' });
    await mobileNav.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  } else {
    // Desktop viewport: navigate via topbar navigation bar
    const desktopNav = page.locator('header.bento-header').getByRole('navigation', { name: 'Điều hướng chính' });
    await desktopNav.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  }

  await expect(page.getByRole('main')).toBeVisible();
}

export interface OverflowAuditResult {
  isOverflowing: boolean;
  docScrollWidth: number;
  bodyScrollWidth: number;
  innerWidth: number;
  maxScrollWidth: number;
  overflowingElements: string[];
}

/**
 * Checks for horizontal overflow across documentElement, body, and child elements.
 * Verifies Invariant G7: document.documentElement.scrollWidth > window.innerWidth.
 */
export async function checkHorizontalOverflow(page: Page): Promise<OverflowAuditResult> {
  return await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const winWidth = window.innerWidth;
    const docScrollWidth = docEl.scrollWidth;
    const bodyScrollWidth = body.scrollWidth;
    const maxScrollWidth = Math.max(docScrollWidth, bodyScrollWidth);
    const isOverflowing = docScrollWidth > winWidth || bodyScrollWidth > winWidth;

    const overflowingElements: string[] = [];
    if (isOverflowing) {
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 1) {
          const tag = el.tagName.toLowerCase();
          const className = el.className && typeof el.className === 'string'
            ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
            : '';
          const id = el.id ? `#${el.id}` : '';
          const textPreview = (el.textContent || '').trim().slice(0, 30);
          overflowingElements.push(
            `${tag}${id}${className} [right: ${Math.round(rect.right)}px > winWidth: ${winWidth}px] "${textPreview}"`
          );
          if (overflowingElements.length >= 6) break;
        }
      }
    }

    return {
      isOverflowing,
      docScrollWidth,
      bodyScrollWidth,
      innerWidth: winWidth,
      maxScrollWidth,
      overflowingElements
    };
  });
}

/**
 * Asserts that the current view fits within the viewport without horizontal scroll/overflow.
 */
export async function assertNoHorizontalScroll(
  page: Page,
  viewName: string,
  targetViewportWidth?: number
) {
  const result = await checkHorizontalOverflow(page);
  const widthLabel = targetViewportWidth ? `${targetViewportWidth}px` : `${result.innerWidth}px`;

  const failureDetails = result.isOverflowing
    ? `\n  - document.documentElement.scrollWidth: ${result.docScrollWidth}px` +
      `\n  - window.innerWidth: ${result.innerWidth}px` +
      `\n  - overflowing delta: +${result.docScrollWidth - result.innerWidth}px` +
      `\n  - offending elements:\n    * ${result.overflowingElements.join('\n    * ')}`
    : '';

  expect(
    result.isOverflowing,
    `View "${viewName}" has horizontal scroll/overflow on ${widthLabel} mobile viewport.${failureDetails}`
  ).toBe(false);
}
