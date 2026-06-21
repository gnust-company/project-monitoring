"""Dọn object MinIO khi xóa thực thể cha (issue #21).

Tránh leak disk: xóa phase/dự án/workspace/user làm các bản ghi attachment &
avatar bị xóa cascade ở DB, nhưng object trên MinIO thì không tự mất. Helper
này xóa object theo URL đã lưu trong DB (phải thu thập TRƯỚC khi xóa hàng DB).

Best-effort: lỗi xóa 1 object chỉ ghi log, không chặn thao tác xóa thực thể —
orphan file hiếm gặp còn đỡ hơn là không xóa được dự án.
"""
import logging

from app.application.ports import ObjectStorage

logger = logging.getLogger(__name__)


async def purge_object_urls(storage: ObjectStorage, bucket: str, urls: list[str]) -> None:
    """Xóa khỏi `bucket` mọi object ứng với `urls`.

    URL không thuộc bucket này (vd link ngoài) → `key_from_url` trả None → bỏ qua.
    """
    for url in urls:
        if not url:
            continue
        key = storage.key_from_url(bucket, url)
        if not key:
            continue
        try:
            await storage.delete(bucket, key)
        except Exception:  # noqa: BLE001 — best-effort, không để rò 1 file chặn cả xóa
            logger.warning("Không xóa được object MinIO: bucket=%s key=%s", bucket, key, exc_info=True)
