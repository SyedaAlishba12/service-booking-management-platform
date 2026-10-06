"""Standard API response envelope (Technical Rules, section 8).

Success: {"success": true, "message": "...", "data": {...}}
Error:   {"success": false, "message": "...", "data": null}

Lists use PaginatedData, which matches frontend/src/types/api.ts:
{"items": [...], "meta": {"page", "page_size", "total", "total_pages"}}

NOTE: if Alishba adds her own shared response helpers, replace the imports of this
file with hers (it is only imported by controllers and routes).
"""
from math import ceil
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Success"
    data: T | None = None


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    meta: PaginationMeta


def ok(data=None, message: str = "Success") -> ApiResponse:
    return ApiResponse(success=True, message=message, data=data)


def paginated(items: list, total: int, page: int, page_size: int) -> PaginatedData:
    return PaginatedData(
        items=items,
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=ceil(total / page_size) if total else 0,
        ),
    )
