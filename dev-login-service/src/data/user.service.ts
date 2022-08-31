import { Injectable } from "@nestjs/common";
import request, { gql } from "graphql-request";
import { GropiusUser } from "src/model/user/GropiusUser";

@Injectable()
export class UserService {
    async getGropiusUserById(id: string): Promise<GropiusUser | null> {
        try {
            return (
                await request<{ node: GropiusUser }>(
                    process.env.API_ENDPOINT,
                    gql`
                        query User($id: ID!) {
                            node(id: $id) {
                                ... on GropiusUser {
                                    id
                                    username
                                    displayName
                                }
                            }
                        }
                    `,
                    { id: id },
                )
            ).node;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async getGropiusUserByUsername(
        username: string,
    ): Promise<GropiusUser | null> {
        try {
            return (
                await request<{ node: GropiusUser }>(
                    process.env.API_ENDPOINT,
                    gql`
                        query User($name: String!) {
                            users(name: $name) {
                                ... on GropiusUser {
                                    id
                                    username
                                    displayName
                                }
                            }
                        }
                    `,
                    { name: username },
                )
            ).node;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async createUser(input: {
        username: string;
        displayName: string;
        email: string;
        isAdmin: boolean;
    }): Promise<GropiusUser> {
        return await request<{
            createGropiusUser: { gropiusUser: GropiusUser };
        }>(
            process.env.API_ENDPOINT,
            gql`
                mutation Create($input: CreateGropiusUserInput!) {
                    createGropiusUser(input: $input) {
                        gropiusUser {
                            id
                            username
                            displayName
                        }
                    }
                }
            `,
            { input },
        ).then((user) => {
            console.log(user);
            return user.createGropiusUser.gropiusUser;
        });
    }
}
