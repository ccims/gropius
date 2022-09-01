import { Injectable } from "@nestjs/common";
import request, { gql } from "graphql-request";
import { GropiusUser } from "src/model/user/GropiusUser";

@Injectable()
export class UserService {
    async getGropiusUserById(id: string): Promise<GropiusUser | null> {
        try {
            return (
                await request<{ node: GropiusUser }>({
                    url: process.env.API_ENDPOINT,
                    document: gql`
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
                    variables: { id: id },
                    requestHeaders: {
                        Authorization: "Bearer " + process.env.INTERNAL_API_KEY,
                    },
                })
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
                await request<{ gropiusUser: GropiusUser }>({
                    url: process.env.API_ENDPOINT,
                    document: gql`
                        query User($name: String!) {
                            gropiusUser(username: $name) {
                                ... on GropiusUser {
                                    id
                                    username
                                    displayName
                                }
                            }
                        }
                    `,
                    variables: { name: username },
                    requestHeaders: {
                        Authorization: "Bearer " + process.env.INTERNAL_API_KEY,
                    },
                })
            ).gropiusUser;
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
        }>({
            url: process.env.API_ENDPOINT,
            document: gql`
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
            variables: { input },
            requestHeaders: {
                Authorization: "Bearer " + process.env.INTERNAL_API_KEY,
            },
        }).then((user) => {
            console.log(user);
            return user.createGropiusUser.gropiusUser;
        });
    }
}
