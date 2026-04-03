interface CrudTableModel {
  id?: number;
  /**
   * 名称
   */
  name: string;
  /**
   * 值
   */
  value: string;
  /**
   * 描述
   */
  remark?: string;
}

type CrudTableParams = Partial<Omit<CrudTableModel, 'id'>>;

export async function getListApi(params?: CrudTableParams) {
  return usePost<CrudTableModel[]>('/list/getCrudTableList', params);
}

export async function deleteApi(id: string | number) {
  return usePost(`/list/deleteCrudTable`, { id });
}

export type { CrudTableModel, CrudTableParams };
