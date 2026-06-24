export class WebResponse<T> {
    success: boolean
    message: string
    data?: T
    errors?: T
}