import { Request } from "express";
import { AuthUser } from "src/auth/auth.types";

export interface RequestWithUser extends Request {
  user: AuthUser;
}
