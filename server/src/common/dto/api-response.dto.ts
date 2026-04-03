export class ApiResponseDto<T = any> {
  code: number;
  msg: string;
  data?: T;

  constructor(code: number, msg: string, data?: T) {
    this.code = code;
    this.msg = msg;
    this.data = data;
  }

  static success<T>(data: T, msg: string = 'success'): ApiResponseDto<T> {
    return new ApiResponseDto<T>(200, msg, data);
  }

  static error(msg: string, code: number = 500): ApiResponseDto<null> {
    return new ApiResponseDto<null>(code, msg, undefined);
  }
}

