"""Phase blocks + items + comments + changelog (activity)."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.application.use_cases.attachments import (
    AddFileAttachment,
    AddLinkAttachment,
    AttachmentNotFoundError,
    DeleteAttachment,
    ListAttachments,
)
from app.application.use_cases.phase_blocks import (
    AddComment,
    AddPhaseItem,
    CreatePhaseBlock,
    CreatePhaseBlockInput,
    DeletePhaseBlock,
    DeletePhaseItem,
    GetPhaseBlock,
    ListActivity,
    ListComments,
    ListPhaseBlocks,
    PhaseBlockNotFoundError,
    PhaseForbiddenError,
    PhaseItemNotFoundError,
    UpdatePhaseBlock,
    UpdatePhaseItem,
)
from app.presentation.api.deps import (
    AccessDep,
    BlockAccessDep,
    ProjectAccessDep,
    add_comment_uc,
    add_file_uc,
    add_item_uc,
    add_link_uc,
    create_block_uc,
    delete_attachment_uc,
    delete_block_uc,
    delete_item_uc,
    get_block_uc,
    list_activity_uc,
    list_attachments_uc,
    list_blocks_uc,
    list_comments_uc,
    update_block_uc,
    update_item_uc,
)
from app.presentation.api.schemas import (
    ActivityOut,
    AttachmentOut,
    CommentCreate,
    CommentOut,
    LinkAttachmentCreate,
    PhaseBlockCreate,
    PhaseBlockOut,
    PhaseBlockUpdate,
    PhaseItemCreate,
    PhaseItemOut,
    PhaseItemUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["phase-blocks"])


# ─── List ────────────────────────────────────────────────────────────
@router.get("/organizations/{org_id}/phase-blocks", response_model=list[PhaseBlockOut])
async def list_by_org(
    org_id: UUID, access: AccessDep, uc: Annotated[ListPhaseBlocks, Depends(list_blocks_uc)]
) -> list[PhaseBlockOut]:
    return [PhaseBlockOut.from_entity(b) for b in await uc.by_org(org_id)]


@router.get("/projects/{project_id}/phase-blocks", response_model=list[PhaseBlockOut])
async def list_by_project(
    project_id: UUID, access: ProjectAccessDep, uc: Annotated[ListPhaseBlocks, Depends(list_blocks_uc)]
) -> list[PhaseBlockOut]:
    return [PhaseBlockOut.from_entity(b) for b in await uc.by_project(project_id)]


@router.post("/projects/{project_id}/phase-blocks", response_model=PhaseBlockOut,
             status_code=status.HTTP_201_CREATED)
async def create_block(
    project_id: UUID, body: PhaseBlockCreate, access: ProjectAccessDep,
    uc: Annotated[CreatePhaseBlock, Depends(create_block_uc)],
) -> PhaseBlockOut:
    block = await uc.execute(CreatePhaseBlockInput(
        project_id=project_id, phase_type=body.phase_type, title=body.title,
        start_date=body.start_date, end_date=body.end_date, created_by=access.user.id,
        tag=body.tag, description=body.description, assignee=body.assignee,
        actual_end_date=body.actual_end_date, display_row=body.display_row,
        participant_ids=body.participant_ids,
        checklist=[s.model_dump(mode="json") for s in body.checklist] if body.checklist is not None else None,
        outcomes=[s.model_dump(mode="json") for s in body.outcomes] if body.outcomes is not None else None,
    ))
    return PhaseBlockOut.from_entity(block, full=True)


# ─── Detail / update / delete ────────────────────────────────────────
@router.get("/phase-blocks/{block_id}", response_model=PhaseBlockOut)
async def get_block(
    block_id: UUID, access: BlockAccessDep, uc: Annotated[GetPhaseBlock, Depends(get_block_uc)]
) -> PhaseBlockOut:
    try:
        block = await uc.execute(block_id)
    except PhaseBlockNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase block not found")
    return PhaseBlockOut.from_entity(block, full=True)


@router.patch("/phase-blocks/{block_id}", response_model=PhaseBlockOut)
async def update_block(
    block_id: UUID, body: PhaseBlockUpdate, access: BlockAccessDep,
    uc: Annotated[UpdatePhaseBlock, Depends(update_block_uc)],
) -> PhaseBlockOut:
    payload = body.model_dump(mode="json", exclude_unset=True, by_alias=False)
    try:
        block = await uc.execute(block_id, payload, access.user)
    except PhaseBlockNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase block not found")
    except PhaseForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(e))
    return PhaseBlockOut.from_entity(block, full=True)


@router.delete("/phase-blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(
    block_id: UUID, access: BlockAccessDep, uc: Annotated[DeletePhaseBlock, Depends(delete_block_uc)]
) -> None:
    try:
        await uc.execute(block_id, access.user)
    except PhaseBlockNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase block not found")
    except PhaseForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(e))


# ─── Items ───────────────────────────────────────────────────────────
@router.post("/phase-blocks/{block_id}/items", response_model=PhaseItemOut,
             status_code=status.HTTP_201_CREATED)
async def add_item(
    block_id: UUID, body: PhaseItemCreate, access: BlockAccessDep,
    uc: Annotated[AddPhaseItem, Depends(add_item_uc)],
) -> PhaseItemOut:
    item = await uc.execute(block_id, body.kind, body.text, body.role, access.user.id)
    return PhaseItemOut.model_validate(item)


@router.patch("/phase-blocks/{block_id}/items/{item_id}", response_model=PhaseItemOut)
async def update_item(
    block_id: UUID, item_id: UUID, body: PhaseItemUpdate, access: BlockAccessDep,
    uc: Annotated[UpdatePhaseItem, Depends(update_item_uc)],
) -> PhaseItemOut:
    try:
        item = await uc.execute(block_id, item_id, body.model_dump(exclude_unset=True), access.user.id)
    except PhaseItemNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Item not found")
    return PhaseItemOut.model_validate(item)


@router.delete("/phase-blocks/{block_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    block_id: UUID, item_id: UUID, access: BlockAccessDep,
    uc: Annotated[DeletePhaseItem, Depends(delete_item_uc)],
) -> None:
    await uc.execute(block_id, item_id, access.user.id)


# ─── Comments ────────────────────────────────────────────────────────
@router.get("/phase-blocks/{block_id}/comments", response_model=list[CommentOut])
async def list_comments(
    block_id: UUID, access: BlockAccessDep, uc: Annotated[ListComments, Depends(list_comments_uc)]
) -> list[CommentOut]:
    return [CommentOut.model_validate(c) for c in await uc.execute(block_id)]


@router.post("/phase-blocks/{block_id}/comments", response_model=CommentOut,
             status_code=status.HTTP_201_CREATED)
async def add_comment(
    block_id: UUID, body: CommentCreate, access: BlockAccessDep,
    uc: Annotated[AddComment, Depends(add_comment_uc)],
) -> CommentOut:
    comment = await uc.execute(block_id, body.content, access.user.id)
    return CommentOut.model_validate(comment)


# ─── Changelog (activity) ────────────────────────────────────────────
@router.get("/phase-blocks/{block_id}/activity", response_model=list[ActivityOut])
async def phase_activity(
    block_id: UUID, access: BlockAccessDep, uc: Annotated[ListActivity, Depends(list_activity_uc)]
) -> list[ActivityOut]:
    return [ActivityOut.model_validate(a) for a in await uc.by_phase(block_id)]


@router.get("/projects/{project_id}/activity", response_model=list[ActivityOut])
async def project_activity(
    project_id: UUID, access: ProjectAccessDep, uc: Annotated[ListActivity, Depends(list_activity_uc)]
) -> list[ActivityOut]:
    return [ActivityOut.model_validate(a) for a in await uc.by_project(project_id)]


# ─── Attachments (document) ──────────────────────────────────────────
@router.get("/phase-blocks/{block_id}/attachments", response_model=list[AttachmentOut])
async def list_attachments(
    block_id: UUID, access: BlockAccessDep, uc: Annotated[ListAttachments, Depends(list_attachments_uc)]
) -> list[AttachmentOut]:
    return [AttachmentOut.model_validate(a) for a in await uc.execute(block_id)]


@router.post("/phase-blocks/{block_id}/attachments/link", response_model=AttachmentOut,
             status_code=status.HTTP_201_CREATED)
async def add_link_attachment(
    block_id: UUID, body: LinkAttachmentCreate, access: BlockAccessDep,
    uc: Annotated[AddLinkAttachment, Depends(add_link_uc)],
) -> AttachmentOut:
    att = await uc.execute(block_id, body.file_name, body.url, access.user.id)
    return AttachmentOut.model_validate(att)


@router.post("/phase-blocks/{block_id}/attachments/file", response_model=AttachmentOut,
             status_code=status.HTTP_201_CREATED)
async def add_file_attachment(
    block_id: UUID, access: BlockAccessDep,
    uc: Annotated[AddFileAttachment, Depends(add_file_uc)],
    file: Annotated[UploadFile, File()],
) -> AttachmentOut:
    data = await file.read()
    att = await uc.execute(
        block_id, file.filename or "file", file.content_type or "", data, access.user.id
    )
    return AttachmentOut.model_validate(att)


@router.delete("/phase-blocks/{block_id}/attachments/{attachment_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    block_id: UUID, attachment_id: UUID, access: BlockAccessDep,
    uc: Annotated[DeleteAttachment, Depends(delete_attachment_uc)],
) -> None:
    try:
        await uc.execute(block_id, attachment_id, access.user.id)
    except AttachmentNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attachment not found")
