class ApiResponse{
    constructor(statusCode , data , massege = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.massege = massege
        this.success = statusCode < 400

    }
}

export {ApiResponse};