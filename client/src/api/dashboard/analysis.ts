export interface ListResultModel {
  id: number;
  title: string;
  username: string;
  password: string;
}

export type ListResultParams = Partial<Omit<ListResultModel, 'id' | 'password'>>;

export async function getListApi(params?: ListResultParams) {
  return usePost<ListResultModel[]>('/list/getList', params);
}

export type CreateListParams = Partial<Omit<ListResultModel, 'id'>>;

export async function createListApi(params: CreateListParams) {
  return usePost('/list/createList', params);
}

export async function editListApi(params: ListResultModel) {
  return usePost('/list/editList', params);
}

export async function delListApi(id: string | number) {
  return usePost('/list/delList', { id });
}
