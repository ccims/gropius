import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Query,
} from "@nestjs/common";
import { AppService } from "./app.service";
import { UserService } from "./data/user.service";
import { HtmlService } from "./html/html.service";
import { GropiusUser } from "./model/user/GropiusUser";
import { TokenService } from "./token/token.service";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly tokenService: TokenService,
        private readonly userService: UserService,
        private readonly htmlService: HtmlService,
    ) { }

    @Get("/syncApi/getIMSToken")
    async getIMSToken(
        @Query("imsUser") imsUser: string,
    ): Promise<any> {
        return { token: process.env.GITHUB_DUMMY_PAT, isImsUserKnown: true };
    }

    @Put("/syncApi/linkIMSUser")
    async linkIMSUser(
        @Query("imsUser") imsUser: string,
    ): Promise<string> {
        return "";
    }

    @Get()
    getHello(): string {
        console.log("Bla");
        return this.htmlService.stringWrapHtml(
            this.htmlService.linebreaks(
                "Dev-Login service.\nGet API token by for example posting username to /token?username=[USERNAME]\n",
            ) +
            this.htmlService.getForm(
                "Generate Token (fill EITHER):",
                {
                    username: { label: "Username: " },
                    id: { label: "User-Id: " },
                },
                "/token",
                "get",
                "Generate",
            ) +
            this.htmlService.getForm(
                "Create user:",
                {
                    username: { label: "Username: " },
                    displayName: { label: "Display-Name: " },
                    email: { label: "Email (opt.): " },
                    isAdmin: {
                        label: "Is admin: ",
                        type: "checkbox",
                        value: "true",
                    },
                },
                "/newUser",
                "post",
                "Create",
            ),
        );
    }

    @Get("/token")
    async createToken(
        @Query("username") user: string,
        @Query("id") id: string,
    ): Promise<string> {
        if (!user && !id) {
            throw new HttpException(
                "Neither username nor id for token user given",
                HttpStatus.BAD_REQUEST,
            );
        } else if (!!user && !!id) {
            throw new HttpException(
                "Only username OR id may be given",
                HttpStatus.BAD_REQUEST,
            );
        }
        let gropiusUser: GropiusUser | null;
        if (id) {
            gropiusUser = await this.userService.getGropiusUserById(id);
        } else if (user) {
            gropiusUser = await this.userService.getGropiusUserByUsername(user);
        }
        if (gropiusUser === null) {
            throw new HttpException(
                "The given ID or username did nt match a valid existing gropius user",
                HttpStatus.NOT_FOUND,
            );
        }
        return this.tokenService.getNewTokenForUser(gropiusUser);
    }

    @Post("/newUser")
    async newUser(
        @Body()
        body: {
            username: string;
            displayName: string;
            email: string;
            isAdmin: string;
        },
    ): Promise<string> {
        if (!body.username) {
            throw new HttpException(
                "Username must be given",
                HttpStatus.BAD_REQUEST,
            );
        }
        if (!body.displayName) {
            throw new HttpException(
                "Display name must be given",
                HttpStatus.BAD_REQUEST,
            );
        }
        const isAdmin = body.isAdmin === "true";
        return (
            await this.userService.createUser({
                username: body.username,
                displayName: body.displayName,
                email: body.email,
                isAdmin,
            })
        ).id;
    }
}
