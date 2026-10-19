import { Request, Response } from 'express';

interface IPasswordValidationRequest {
	password?: unknown;
	Password?: unknown;
	username?: unknown;
	Username?: unknown;
}

export default {
	method: 'all',
	func: (Request: Request, Response: Response) => {
		if (Request.method === 'OPTIONS') return Response.status(204).send();
		if (Request.method !== 'POST' && Request.method !== 'GET') {
			return Response.status(405).json({ valid: false, errors: [{ message: 'Use GET or POST to validate a password.' }] });
		}

		const Body = (Request.method === 'GET' ? Request.query : Request.body || {}) as IPasswordValidationRequest;
		const PasswordValue = Body.password ?? Body.Password;
		const UsernameValue = Body.username ?? Body.Username;
		const Password = typeof PasswordValue === 'string' ? PasswordValue : '';
		const Username = typeof UsernameValue === 'string' ? UsernameValue.trim() : '';
		const Errors: { message: string }[] = [];

		if (Password.length < 8 || Password.length > 128 || Password.trim().length === 0) {
			Errors.push({ message: 'Passwords must be between 8 and 128 characters.' });
		}
		if (Username && Password.toLowerCase() === Username.toLowerCase()) {
			Errors.push({ message: 'Your password cannot be the same as your username.' });
		}

		return Response.status(200).json({ valid: Errors.length === 0, errors: Errors });
	},
};
