/**
 * 通用 API 响应 DTO
 * @template T 响应数据的类型
 */
export class ApiResponseDto<T = any> {
  /** 状态码 */
  code: number;

  /** 响应消息 */
  msg: string;

  /** 响应数据 */
  data?: T;

  constructor(code: number, msg: string, data?: T) {
    this.code = code;
    this.msg = msg;
    this.data = data;
  }

  /**
   * 创建成功响应
   * @param data 响应数据
   * @param msg 成功消息，默认为 'success'
   */
  static success<T>(data: T, msg: string = 'success'): ApiResponseDto<T> {
    return new ApiResponseDto<T>(200, msg, data);
  }

  /**
   * 创建错误响应
   * @param msg 错误消息
   * @param code 错误代码，默认为 500
   */
  static error(msg: string, code: number = 500): ApiResponseDto<null> {
    return new ApiResponseDto<null>(code, msg, undefined);
  }
}
