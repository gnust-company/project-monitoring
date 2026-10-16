"""Lỗi API có mã ổn định (#29 đa ngôn ngữ).

Body lỗi: ``{"detail": "<câu tiếng Anh cho dev>", "code": "<mã>", "params": {...}}``.
FE dịch theo ``code`` (+ ``params``); ``detail`` chỉ để debug/hiển thị dự phòng.
Danh sách mã: docs/API_CONTRACT.md (mục "Lỗi").
"""
from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class ApiError(HTTPException):
    def __init__(self, status_code: int, error_code: str, detail: str, /, **params: Any) -> None:
        super().__init__(status_code=status_code, detail=detail)
        self.code = error_code
        self.params = params


async def api_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, ApiError)
    body: dict[str, Any] = {"detail": exc.detail, "code": exc.code}
    if exc.params:
        body["params"] = exc.params
    return JSONResponse(body, status_code=exc.status_code, headers=exc.headers)
