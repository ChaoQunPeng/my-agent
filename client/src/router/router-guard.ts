/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2025-09-25 09:45:23
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2025-10-17 10:47:27
 * @FilePath: /fadu-ai/src/router/router-guard.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { AxiosError } from 'axios'
import { setRouteEmitter } from '~@/utils/route-listener'
import { useMetaTitle } from '~/composables/meta-title'
import router from '~/router'

const allowList = ['/login', '/error', '/401', '/404', '/403']
const loginPath = '/login'

router.beforeEach(async (to, _, next) => {
  setRouteEmitter(to)
  // 获取
  const userStore = useUserStore()
  const token = useAuthorization()
  console.log('Token存在:', !!token.value)
  console.log('用户信息:', userStore.userInfo)
  console.log('是否在白名单:', allowList.includes(to.path))

  if (!token.value) {
    //  如果token不存在就跳转到登录页面
    if (!allowList.includes(to.path) && !to.path.startsWith('/redirect')) {
      console.log('未登录且不在白名单，跳转到登录页')
      next({
        path: loginPath,
        query: {
          redirect: encodeURIComponent(to.fullPath)
        }
      })
      return
    }
    console.log('未登录但在白名单，允许访问')
  } else {
    if (!userStore.userInfo && !allowList.includes(to.path) && !to.path.startsWith('/redirect')) {
      try {
        // 获取用户信息
        await userStore.getUserInfo()
        // 获取路由菜单的信息
        const currentRoute = await userStore.generateDynamicRoutes()
        router.addRoute(currentRoute)
        next({
          ...to,
          replace: true
        })
        return
      } catch (e) {
        if (e instanceof AxiosError && e?.response?.status === 401) {
          // 跳转到error页面
          next({
            path: '/401'
          })
        }
      }
    } else {
      // 如果当前是登录页面就跳转到首页
      if (to.path === loginPath) {
        next({
          path: '/'
        })
        return
      }
    }
  }
  console.log('路由守卫通过，允许导航')
  next()
})

router.afterEach(to => {
  useMetaTitle(to)
  useLoadingCheck()
  useScrollToTop()
})
