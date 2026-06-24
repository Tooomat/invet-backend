import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { TestModule } from './test.module';
import { TestService } from './test.service';

import cookieParser from 'cookie-parser';

describe('AuthController', () => {
  let app: INestApplication<App>;
  let testService: TestService

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    testService = app.get(TestService)
  });

  afterEach(async () => {
    await testService.deleteUser('test@example.com')
    await app.close()
  })

  describe("POST /api/auth/register", () => {
    it('should register successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@example.com',
          password: 'Password123!',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('Registration successfull')
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.firstName).toBe('John')
      expect(res.body.data.lastName).toBe('Doe')
      expect(res.body.data.email).toBe('test@example.com')
      expect(res.body.data.createdAt).toBeDefined()
    })

    it('should register successfully without lastName', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'test@example.com',
          password: 'Password123!',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.lastName).toBeNull()
    })

    it('should fail if email already exists', async () => {
      // register pertama
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'test@example.com',
          password: 'Password123!',
        })

      // register kedua dengan email sama
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'Jane',
          email: 'test@example.com',
          password: 'Password123!',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBeUndefined()
    })

    it('should fail if firstName is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: '',
          email: 'test@example.com',
          password: 'Password123!',
        })

      expect(res.status).toBe(400)
    })

    it('should fail if email is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'invalid-email',
          password: 'Password123!',
        })

      expect(res.status).toBe(400)
    })

    it('should fail if password has no uppercase', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'test@example.com',
          password: 'password123!',
        })

      expect(res.status).toBe(400)
    })

    it('should fail if password has no lowercase', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'test@example.com',
          password: 'PASSWORD123!',
        })

      expect(res.status).toBe(400)
    })

    it('should fail if password has no number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'test@example.com',
          password: 'Password!!!',
        })

      expect(res.status).toBe(400)
    })

    it('should fail if password has no special character', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'test@example.com',
          password: 'Password123',
        })

      expect(res.status).toBe(400)
    })

    it('should fail if password is less than 8 characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'test@example.com',
          password: 'Pa1!',
        })

      expect(res.status).toBe(400)
    })

    it('should fail if email is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          password: 'Password123!',
        })

      expect(res.status).toBe(400)
    })

    it('should fail if password is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          email: 'test@example.com',
        })

      expect(res.status).toBe(400)
    })

  })

  describe("POST /api/auth/login", () => {

    beforeEach(async () => {
        await testService.createUser('test@example.com', 'Password123!')
    })

    it('should login successfully', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'Password123!',
            })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe('Login successfull')
        expect(res.body.data.accessToken).toBeDefined()

        // refresh token harus ada di cookie, bukan di body
        expect(res.body.data.refreshToken).toBeUndefined()
        const cookies = res.headers['set-cookie'] as unknown as string[]
        expect(cookies).toBeDefined()
        expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true)
        expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true)
    })

    it('should fail if email is not registered', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: 'notfound@example.com',
                password: 'Password123!',
            })

        expect(res.status).toBe(401)
        expect(res.body.success).toBeUndefined()
    })

    it('should fail if password is wrong', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'WrongPassword123!',
            })

        expect(res.status).toBe(401)
        expect(res.body.success).toBeUndefined()
    })

    it('should fail if email is invalid format', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: 'invalid-email',
                password: 'Password123!',
            })

        expect(res.status).toBe(400)
    })

    it('should fail if email is missing', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                password: 'Password123!',
            })

        expect(res.status).toBe(400)
    })

    it('should fail if password is missing', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
            })

        expect(res.status).toBe(400)
    })

    it('should fail if password has no uppercase', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123!',
            })

        expect(res.status).toBe(400)
    })

    it('should fail if body is empty', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({})

        expect(res.status).toBe(400)
    })
  })

  describe("POST /api/auth/refresh", () => {

    beforeEach(async () => {
        await testService.createUser('test@example.com', 'Password123!')
    })

    it('should renew access token successfully', async () => {
        const refreshTokenCookie = await testService.loginUser(app, 'test@example.com', 'Password123!')
        expect(refreshTokenCookie).toBeDefined()

        const res = await request(app.getHttpServer())
            .post('/api/auth/refresh')
            .set('Cookie', refreshTokenCookie!)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.newAccessToken).toBeDefined()
    })

    it('should fail if refresh token cookie is missing', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/refresh')

        expect(res.status).toBe(401)
    })

    it('should fail if refresh token is invalid', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/refresh')
            .set('Cookie', 'refreshToken=invalidtoken')

        expect(res.status).toBe(401)
    })

    it('should fail if user is blocked', async () => {
        const refreshTokenCookie = await testService.loginUser(app, 'test@example.com', 'Password123!')
        expect(refreshTokenCookie).toBeDefined()

        // block user
        await testService.blockUser('test@example.com')

        const res = await request(app.getHttpServer())
            .post('/api/auth/refresh')
            .set('Cookie', refreshTokenCookie!)

        expect(res.status).toBe(403)
    })
  })

  describe("POST /api/auth/logout", () => {

    beforeEach(async () => {
        await testService.createUser('test@example.com', 'Password123!')
    })

    it('should logout successfully', async () => {
        const refreshTokenCookie = await testService.loginUser(app, 'test@example.com', 'Password123!')
        const accessToken = await testService.getAccessToken(app, 'test@example.com', 'Password123!')

        const res = await request(app.getHttpServer())
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Cookie', refreshTokenCookie!)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe('Logout successful')

        // cookie harus dihapus
        const cookies = res.headers['set-cookie'] as unknown as string[]
        expect(cookies.some((c: string) => c.includes('refreshToken=;'))).toBe(true)
    })

    // it('should blacklist access token after logout', async () => {
    //     const refreshTokenCookie = await testService.loginUser(app, 'test@example.com', 'Password123!')
    //     const accessToken = await testService.getAccessToken(app, 'test@example.com', 'Password123!')

    //     // logout
    //     await request(app.getHttpServer())
    //         .post('/api/auth/logout')
    //         .set('Authorization', `Bearer ${accessToken}`)
    //         .set('Cookie', refreshTokenCookie!)

    //     // akses protected route dengan token yang sudah di-blacklist
    //     const res = await request(app.getHttpServer())
    //         .get('/api/users/current')
    //         .set('Authorization', `Bearer ${accessToken}`)

    //     expect(res.status).toBe(401)
    // })

    it('should invalidate refresh token after logout', async () => {
        const refreshTokenCookie = await testService.loginUser(app, 'test@example.com', 'Password123!')
        const accessToken = await testService.getAccessToken(app, 'test@example.com', 'Password123!')

        // logout
        await request(app.getHttpServer())
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Cookie', refreshTokenCookie!)

        // coba renew dengan refresh token yang sudah dihapus
        const res = await request(app.getHttpServer())
            .post('/api/auth/refresh')
            .set('Cookie', refreshTokenCookie!)

        expect(res.status).toBe(401)
    })

    it('should fail if access token is missing', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/logout')

        expect(res.status).toBe(401)
    })

    it('should fail if access token is invalid', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/logout')
            .set('Authorization', 'Bearer invalidtoken')

        expect(res.status).toBe(401)
    })

    it('should fail if access token is already blacklisted', async () => {
        const refreshTokenCookie = await testService.loginUser(app, 'test@example.com', 'Password123!')
        const accessToken = await testService.getAccessToken(app, 'test@example.com', 'Password123!')

        // logout pertama
        await request(app.getHttpServer())
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Cookie', refreshTokenCookie!)

        // logout kedua dengan token yang sama
        const res = await request(app.getHttpServer())
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Cookie', refreshTokenCookie!)

        expect(res.status).toBe(401)
    })
  })

});
