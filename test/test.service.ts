import { Injectable, INestApplication } from "@nestjs/common";
import { PrismaService } from "src/common/prisma.service";
import bcrypt from 'bcrypt'
import request from 'supertest'

@Injectable()
export class TestService {
    constructor(private prismaService: PrismaService) {}

    async deleteUser(email: string) {
        await this.prismaService.user.deleteMany({
            where: { email }
        })
    }

    async createUser(email: string, password: string) {
        const hashed = await bcrypt.hash(password, 10)
        await this.prismaService.user.create({
            data: {
                firstName: 'John',
                email,
                password: hashed,
                role: 'USER',
            }
        })
    }

    async loginUser(app: INestApplication, email: string, password: string) {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email, password })
        
        const cookies = res.headers['set-cookie'] as unknown as string[]
        const refreshTokenCookie = cookies?.find((c: string) => c.startsWith('refreshToken='))
        return refreshTokenCookie ?? null
    }

    async blockUser(email: string) {
        await this.prismaService.user.update({
            where: { email },
            data: { status: 'BLOCKED' }
        })
    }

    async getAccessToken(app: INestApplication, email: string, password: string): Promise<string> {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email, password })
        
        return res.body.data.accessToken
    }
}