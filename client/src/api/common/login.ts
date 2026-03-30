/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2025-09-25 09:45:23
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2025-10-20 09:19:55
 * @FilePath: /fadu-ai/src/api/common/login.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

// {
//     "identifier": "18000218161",
//     "password":"123456",
//     "operationDevice": 1,
//     "deviceModel": "Apifox111",
//     "deviceUid": "12456fbas"
// }
export interface LoginParams {
  identifier: string;
  password: string;
  operationDevice?: 1;
  deviceModel: string;
  deviceUid: string;
}

export interface LoginMobileParams {
  mobile: string;
  code: string;
  type: 'mobile';
}

export interface LoginResultModel {
  token: string;
}

export function loginApi(params: LoginParams | LoginMobileParams) {
  return usePost<LoginResultModel, LoginParams | LoginMobileParams>('/user/login_psw', params, {
    // 设置为false的时候不会携带token
    token: false,
    // 开发模式下使用自定义的接口
    customDev: true,
    // 是否开启全局请求loading
    loading: false
  });
}

export function logoutApi() {
  return useGet(
    '/logout',
    {},
    {
      customDev: true
    }
  );
}
