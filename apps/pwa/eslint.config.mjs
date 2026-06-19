import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/** Flat ESLint config for Next.js 16 (native flat config, no FlatCompat). */
const eslintConfig = [
	...nextCoreWebVitals,
	...nextTypescript,
	{
		ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
	},
	{
		// These components intentionally read browser-only state (localStorage,
		// Notification.permission) on mount inside an effect, which is SSR-safe and
		// correct. Downgrade the Next 16 rule from error to warning here.
		rules: {
			'react-hooks/set-state-in-effect': 'warn',
		},
	},
];

export default eslintConfig;
