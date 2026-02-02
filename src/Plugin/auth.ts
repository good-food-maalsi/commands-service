import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { env } from '../Utils/env.js'

export const authPlugin = new Elysia({ name: 'auth' })
    .use(
        jwt({
            name: 'jwt',
            secret: env.JWT_SECRET,
        })
    )
    .derive(async ({ jwt, cookie: { auth }, headers: { authorization } }) => {
        const token = auth?.value || authorization?.slice(7)

        if (!token) {
            return {
                user: null
            }
        }

        const profile = await jwt.verify(token)

        if (!profile) {
            return {
                user: null
            }
        }

        // Assuming the JWT payload contains an 'id' field for the user
        return {
            user: {
                id: profile.id as string,
                ...profile
            }
        }
    })
    .macro(({ onBeforeHandle }) => ({
        isSignIn() {
            onBeforeHandle(({ user, error }: { user: any, error: any }) => {
                if (!user) return error(401, 'Unauthorized')
            })
        }
    }))
