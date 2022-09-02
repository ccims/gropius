import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TokenService } from "./token/token.service";
import { DataModule } from "./data/data.module";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { HtmlService } from "./html/html.service";

@Module({
    imports: [
        DataModule,
        ConfigModule.forRoot({
            envFilePath: [".env.development.local", ".env.development"],
        }),
        JwtModule.register({
            secret: Buffer.from(process.env.JWT_SECRET, "base64"),
            signOptions: {
                issuer: process.env.JWT_ISSUER,
            },
        }),
    ],
    controllers: [AppController],
    providers: [AppService, TokenService, HtmlService],
})
export class AppModule {}
