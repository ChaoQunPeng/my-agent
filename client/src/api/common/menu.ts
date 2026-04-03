import type { MenuData } from '~@/layouts/basic-layout/typing';

export function getRouteMenusApi() {
  return usePost<MenuData>(
    '/menu/getRouteMenus',
    {},
    {
      customDev: true
    }
  );
}
