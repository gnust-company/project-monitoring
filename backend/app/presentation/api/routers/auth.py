"""Auth router — register / login / me + first-run setup (super user)."""
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.application.use_cases.auth import (
    AuthenticateUser,
    EmailDomainNotAllowedError,
    EmailTakenError,
    GetSetupStatus,
    InvalidCredentialsError,
    RegisterUser,
    SetupAlreadyDoneError,
    SetupSuperuser,
)
from app.core.security import create_access_token
from app.presentation.api.deps import (
    CurrentUser,
    authenticate_user_uc,
    register_user_uc,
    setup_status_uc,
    setup_superuser_uc,
)
from app.presentation.api.schemas import (
    LoginIn,
    RegisterIn,
    SetupStatusOut,
    TokenOut,
    UserOut,
)
from app.presentation.api.errors import ApiError

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/setup-status", response_model=SetupStatusOut)
async def setup_status(uc: Annotated[GetSetupStatus, Depends(setup_status_uc)]) -> SetupStatusOut:
    return SetupStatusOut(needs_setup=await uc.execute())


@router.post("/setup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def setup(
    body: RegisterIn,
    uc: Annotated[SetupSuperuser, Depends(setup_superuser_uc)],
) -> TokenOut:
    try:
        user = await uc.execute(body.email, body.password, body.name)
    except SetupAlreadyDoneError:
        raise ApiError(status.HTTP_409_CONFLICT, "auth.setup_done", "Setup already completed")
    return TokenOut(access_token=create_access_token(str(user.id)), user=UserOut.from_entity(user))


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterIn,
    uc: Annotated[RegisterUser, Depends(register_user_uc)],
) -> TokenOut:
    try:
        user = await uc.execute(body.email, body.password, body.name)
    except EmailTakenError:
        raise ApiError(status.HTTP_409_CONFLICT, "auth.email_taken", "Email already registered")
    except EmailDomainNotAllowedError as e:
        # #5: 422 — message kèm allowlist để FE hiện hint.
        raise ApiError(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "auth.email_domain_not_allowed", str(e),
            domains=", ".join(e.allowed),
        )
    return TokenOut(access_token=create_access_token(str(user.id)), user=UserOut.from_entity(user))


@router.post("/login", response_model=TokenOut)
async def login(
    body: LoginIn,
    uc: Annotated[AuthenticateUser, Depends(authenticate_user_uc)],
) -> TokenOut:
    try:
        user = await uc.execute(body.email, body.password)
    except InvalidCredentialsError:
        raise ApiError(status.HTTP_401_UNAUTHORIZED, "auth.invalid_credentials", "Invalid email or password")
    return TokenOut(access_token=create_access_token(str(user.id)), user=UserOut.from_entity(user))


@router.get("/me", response_model=UserOut)
async def me(current: CurrentUser) -> UserOut:
    return UserOut.from_entity(current)
