import type { STATUS } from '~@/utils/constant';

interface ConsultTableModel {
  id: number;
  /**
   * 服务名称
   */
  name: string;
  /**
   * 服务调用次数
   */
  callNo: 805;
  /**
   * 描述
   */
  desc: string;
  /**
   * 状态
   */
  status: STATUS;
  /**
   * 上次调用时间
   */
  updatedAt: string;

  // 分页
  current?: number;
  // size
  pageSize?: number;
}

type ConsultTableParams = Partial<Omit<ConsultTableModel, 'id'>>;

export async function getListApi(params?: ConsultTableParams) {
  return usePost<ConsultTableModel[]>('/list/getConsultList', params);
}

export async function deleteApi(id: string | number) {
  return usePost(`/list/deleteConsult`, { id });
}

export type { ConsultTableModel, ConsultTableParams, STATUS };
