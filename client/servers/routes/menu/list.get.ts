import { defineEventHandler } from 'h3';

// 生成 uuid 的方法
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const menuData = [
  {
    id: 1,
    parentId: null,
    title: '我的项目',
    icon: 'AppstoreOutlined',
    component: '/marketplace/index',
    path: '/main/marketplace',
    name: 'MarketplaceIndex',
    keepAlive: true
  },
  // {
  //   id: 2,
  //   parentId: null,
  //   title: '智能对话',
  //   icon: 'MessageOutlined',
  //   component: '/dialog/index',
  //   path: '/main/dialog',
  //   name: 'DialogIndex',
  //   keepAlive: true
  // },
  {
    id: 2,
    parentId: null,
    title: '设置',
    icon: 'MessageOutlined',
    component: '/dialog/index',
    path: '/main/dialog',
    name: 'DialogIndex',
    keepAlive: true
  },
  // {
  //   id: 3,
  //   parentId: null,
  //   title: '智能文书',
  //   icon: 'FileTextOutlined',
  //   path: '/document-drafting'
  // },
  // {
  //   id: 30,
  //   parentId: 3,
  //   title: '文书起草',
  //   icon: 'FormOutlined',
  //   component: '/document-drafting/index',
  //   path: '/main/document-drafting',
  //   name: 'DocumentDraftingIndex',
  //   keepAlive: true
  // },
  // {
  //   id: 31,
  //   parentId: 3,
  //   title: '合同审查',
  //   icon: 'FileProtectOutlined',
  //   component: '/contract-review/index',
  //   path: '/main/contract-review',
  //   name: 'ContractReviewIndex',
  //   keepAlive: true
  // },
  // {
  //   id: 32,
  //   parentId: 3,
  //   title: '要素式转化',
  //   icon: 'ReconciliationOutlined',
  //   component: '/elemental-conversion/index',
  //   path: '/main/elemental-conversion',
  //   name: 'ElementalConversionIndex',
  //   keepAlive: true
  // },
  // {
  //   id: 4,
  //   parentId: null,
  //   title: '数据检索',
  //   icon: 'SearchOutlined',
  //   path: '/data-retrieval'
  // },
  // {
  //   id: 40,
  //   parentId: 4,
  //   title: '案例检索',
  //   icon: 'FileSearchOutlined',
  //   component: '/case-search/index',
  //   path: '/main/case-search',
  //   name: 'CaseSearchIndex',
  //   keepAlive: true
  // },
  // {
  //   id: 41,
  //   parentId: 4,
  //   title: '法律法规检索',
  //   icon: 'SecurityScanOutlined',
  //   component: '/legal-regulatory-search/index',
  //   path: '/main/legal-regulatory-search',
  //   name: 'LegalRegulatorySearchIndex',
  //   keepAlive: true
  // },
  // {
  //   id: 42,
  //   parentId: 4,
  //   title: '合同检索',
  //   icon: 'ReadOutlined',
  //   component: '/contract-search/index',
  //   path: '/main/contract-search',
  //   name: 'ContractSearchIndex',
  //   keepAlive: true
  // },
  {
    id: 5,
    parentId: null,
    title: '项目',
    component: '/agent/index',
    path: '/main/agent',
    name: 'AgentIndex',
    keepAlive: true,
    hideInMenu: true
  },
  {
    id: 55,
    parentId: null,
    title: '创建项目',
    component: '/agent/create',
    path: '/main/agent-create',
    name: 'AgentCreate',
    keepAlive: true,
    hideInMenu: true
  },
  {
    id: 6,
    parentId: null,
    title: '知识库',
    component: '/knowledge-base/index',
    path: '/main/knowledge-base',
    name: 'KnowledgeBaseIndex',
    keepAlive: true,
    hideInMenu: true
  },
  {
    id: 7,
    parentId: null,
    title: '我的团队',
    component: '/my-team/index',
    path: '/main/my-team',
    name: 'MyTeamIndex',
    keepAlive: true,
    hideInMenu: true
  }
];

export const accessMenuData = [
  {
    id: 18,
    parentId: 15,
    path: '/access/admin',
    title: '管理员',
    name: 'AccessAdmin',
    component: '/access/admin',
    locale: 'menu.access.admin'
  }
];

export default defineEventHandler(event => {
  const token = event.req.headers.get('Authorization');

  if (!token) {
    return {
      code: 401,
      msg: '未授权访问'
    };
  }

  // eslint-disable-next-line node/prefer-global/buffer
  const username = Buffer.from(token, 'base64').toString('utf-8');

  return {
    code: 200,
    msg: '获取成功',
    data: [...menuData, ...(username === 'admin' ? accessMenuData : [])]
  };
});
