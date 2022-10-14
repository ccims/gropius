import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { GropiusUser } from "src/model/user/GropiusUser";

@Injectable()
export class TokenService {
    constructor(private jwtService: JwtService) {}

    getNewTokenForUser(gropiusUser: GropiusUser): string {
        return this.jwtService.sign({}, { subject: gropiusUser.id, audience: "backend" });
    }
}
