import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
} from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    getHello(): string {
        return "Dev-Login service.<br>\nGet API token by posting username to /token?user=[USERNAME]";
    }

    @Get("/token")
    createToken(@Query("user") user: string, @Query("id") id: string): string {
        return "";
    }
}
