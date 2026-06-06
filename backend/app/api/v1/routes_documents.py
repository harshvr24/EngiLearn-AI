"""Document upload and text extraction endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.api.v1.schemas import DocumentExtractResponse
from app.services.document_service import (
    ALLOWED_EXTENSIONS,
    parse_upload,
)

router = APIRouter(tags=["documents"])

MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post(
    "/documents/upload",
    response_model=DocumentExtractResponse,
    summary="Upload a PDF, DOCX, or PPTX and extract its text",
)
async def upload_document(file: UploadFile) -> DocumentExtractResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided.",
        )

    content = await file.read()

    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 20 MB limit.",
        )

    try:
        extract = await parse_upload(
            filename=file.filename,
            content=content,
            mime_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    return DocumentExtractResponse(
        text=extract.text,
        title=extract.title,
        page_count=extract.page_count,
    )
