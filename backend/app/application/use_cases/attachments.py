"""Use cases cho Attachment (document) — link ngoài hoặc file lưu MinIO."""
from uuid import UUID, uuid4

from app.application.ports import ObjectStorage, PhaseBlockRepository
from app.domain.entities import Attachment
from app.domain.value_objects import AttachmentKind


class AttachmentNotFoundError(Exception):
    pass


class ListAttachments:
    def __init__(self, blocks: PhaseBlockRepository) -> None:
        self._blocks = blocks

    async def execute(self, block_id: UUID) -> list[Attachment]:
        return await self._blocks.list_attachments(block_id)


class AddLinkAttachment:
    def __init__(self, blocks: PhaseBlockRepository) -> None:
        self._blocks = blocks

    async def execute(self, block_id: UUID, file_name: str, url: str, uploaded_by: UUID) -> Attachment:
        return await self._blocks.add_attachment(block_id, Attachment(
            id=uuid4(), kind=AttachmentKind.LINK, file_name=file_name, url=url,
            uploaded_by=uploaded_by, uploaded_at=None,
        ))


class AddFileAttachment:
    def __init__(self, blocks: PhaseBlockRepository, storage: ObjectStorage, bucket: str) -> None:
        self._blocks = blocks
        self._storage = storage
        self._bucket = bucket

    async def execute(
        self, block_id: UUID, filename: str, content_type: str, data: bytes, uploaded_by: UUID
    ) -> Attachment:
        key = f"{block_id}/{uuid4().hex}-{filename}"
        url = await self._storage.put(self._bucket, key, data, content_type or "application/octet-stream")
        return await self._blocks.add_attachment(block_id, Attachment(
            id=uuid4(), kind=AttachmentKind.FILE, file_name=filename, url=url,
            uploaded_by=uploaded_by, uploaded_at=None,
        ))


class DeleteAttachment:
    def __init__(self, blocks: PhaseBlockRepository, storage: ObjectStorage, bucket: str) -> None:
        self._blocks = blocks
        self._storage = storage
        self._bucket = bucket

    async def execute(self, attachment_id: UUID) -> None:
        att = await self._blocks.get_attachment(attachment_id)
        if att is None:
            raise AttachmentNotFoundError(str(attachment_id))
        if att.kind == AttachmentKind.FILE:
            key = self._storage.key_from_url(self._bucket, att.url)
            if key:
                await self._storage.delete(self._bucket, key)
        await self._blocks.delete_attachment(attachment_id)
