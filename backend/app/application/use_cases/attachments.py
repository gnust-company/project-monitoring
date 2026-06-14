"""Use cases cho Attachment (document) — link ngoài hoặc file lưu MinIO."""
from uuid import UUID, uuid4

from app.application.ports import ActivityLogRepository, ObjectStorage, PhaseBlockRepository
from app.domain.entities import ActivityEntry, Attachment
from app.domain.value_objects import AttachmentKind


class AttachmentNotFoundError(Exception):
    pass


async def _log(activity: ActivityLogRepository, project_id: UUID, block_id: UUID,
               actor_id: UUID, action: str, target: str) -> None:
    await activity.add(ActivityEntry(
        id=uuid4(), project_id=project_id, user_id=actor_id, action=action,
        target=target, created_at=None, phase_block_id=block_id,
    ))


class ListAttachments:
    def __init__(self, blocks: PhaseBlockRepository) -> None:
        self._blocks = blocks

    async def execute(self, block_id: UUID) -> list[Attachment]:
        return await self._blocks.list_attachments(block_id)


class AddLinkAttachment:
    def __init__(self, blocks: PhaseBlockRepository, activity: ActivityLogRepository) -> None:
        self._blocks = blocks
        self._activity = activity

    async def execute(self, block_id: UUID, file_name: str, url: str, uploaded_by: UUID) -> Attachment:
        att = await self._blocks.add_attachment(block_id, Attachment(
            id=uuid4(), kind=AttachmentKind.LINK, file_name=file_name, url=url,
            uploaded_by=uploaded_by, uploaded_at=None,
        ))
        pid = await self._blocks.get_project_id(block_id)
        if pid:
            await _log(self._activity, pid, block_id, uploaded_by, "attached link", file_name)
        return att


class AddFileAttachment:
    def __init__(self, blocks: PhaseBlockRepository, storage: ObjectStorage, bucket: str,
                 activity: ActivityLogRepository) -> None:
        self._blocks = blocks
        self._storage = storage
        self._bucket = bucket
        self._activity = activity

    async def execute(
        self, block_id: UUID, filename: str, content_type: str, data: bytes, uploaded_by: UUID
    ) -> Attachment:
        key = f"{block_id}/{uuid4().hex}-{filename}"
        url = await self._storage.put(self._bucket, key, data, content_type or "application/octet-stream")
        att = await self._blocks.add_attachment(block_id, Attachment(
            id=uuid4(), kind=AttachmentKind.FILE, file_name=filename, url=url,
            uploaded_by=uploaded_by, uploaded_at=None,
        ))
        pid = await self._blocks.get_project_id(block_id)
        if pid:
            await _log(self._activity, pid, block_id, uploaded_by, "uploaded file", filename)
        return att


class DeleteAttachment:
    def __init__(self, blocks: PhaseBlockRepository, storage: ObjectStorage, bucket: str,
                 activity: ActivityLogRepository) -> None:
        self._blocks = blocks
        self._storage = storage
        self._bucket = bucket
        self._activity = activity

    async def execute(self, block_id: UUID, attachment_id: UUID, actor_id: UUID) -> None:
        att = await self._blocks.get_attachment(attachment_id)
        if att is None:
            raise AttachmentNotFoundError(str(attachment_id))
        if att.kind == AttachmentKind.FILE:
            key = self._storage.key_from_url(self._bucket, att.url)
            if key:
                await self._storage.delete(self._bucket, key)
        await self._blocks.delete_attachment(attachment_id)
        pid = await self._blocks.get_project_id(block_id)
        if pid:
            await _log(self._activity, pid, block_id, actor_id, "removed document", att.file_name)
