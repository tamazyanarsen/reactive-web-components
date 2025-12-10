import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';

type PackageFormat = {
	name: string;
	version: string;
	type: string;
	types: string;
	main?: string;
	module?: string;
	exports: Record<
		string,
		{ import?: string; require?: string; types?: string }
	>;
	peerDependencies?: Record<string, string>;
	description: string;
	keywords: string[];
	author: string;
	license: string;
	repository: {
		type: string;
		url: string;
	};
	homepage: string;
	bugs: {
		url: string;
	};
};

const generatePackageJSON = () => ({
	name: 'generate package.json for library',
	writeBundle(_options: unknown, bundle: { [fileName: string]: unknown }) {
		const [fileName] = Object.keys(bundle);
		const packageJSONFilePath = './dist/package.json';
		const readmeFilePath = './dist/README.md';
		const originPackageData = JSON.parse(
			readFileSync('./package.json').toString()
		) as PackageFormat;
		let packageData: PackageFormat;
		if (existsSync(packageJSONFilePath)) {
			packageData = JSON.parse(
				readFileSync(packageJSONFilePath).toString()
			);
		} else {
			packageData = {
				name: originPackageData.name,
				// version: `${originPackageData.version}+watch${Date.now()}`,
				version: originPackageData.version,
				type: 'module',
				// main: "./dist/my-lib.umd.cjs",
				// module: fileName,
				types: './shared/index.d.ts',
				exports: {
					'.': {
						types: './shared/index.d.ts',
						// import: fileName,
						// require: "./dist/my-lib.umd.cjs"
					},
				},
				peerDependencies: originPackageData.peerDependencies,
				author: originPackageData.author,
				license: originPackageData.license,
				repository: originPackageData.repository,
				homepage: originPackageData.homepage,
				bugs: originPackageData.bugs,
				description: originPackageData.description,
				keywords: originPackageData.keywords,
			};
		}
		if (fileName.includes('.umd.cjs')) {
			packageData.main = `./${fileName}`;
			packageData.exports['.'] = {
				...packageData.exports['.'],
				require: `./${fileName}`,
			};
		} else {
			packageData.module = `./${fileName}`;
			packageData.exports['.'] = {
				...packageData.exports['.'],
				import: `./${fileName}`,
			};
		}
		writeFileSync(
			packageJSONFilePath,
			JSON.stringify(packageData, null, 4)
		);
		writeFileSync(readmeFilePath, readFileSync('./README.md').toString());
	},
});

export default defineConfig({
	plugins: [
		checker({
			typescript: true,
		}),
		dts(),
		generatePackageJSON(),
	],
	server: {
		proxy: {
			'/api': 'http://localhost:3000',
		},
	},
	build: {
		lib: {
			entry: resolve(__dirname, './src/shared/index.ts'),
			name: 'ReactiveComponent',
			fileName: 'reactive-web-component.[hash]',
			// formats: ['es']
		},
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(
			process.env.NODE_ENV || 'development'
		),
	},
	resolve: {
		alias: [
			{
				find: '@shared',
				replacement: fileURLToPath(
					new URL('./src/shared/', import.meta.url)
				),
			},
			{
				find: '@',
				replacement: fileURLToPath(new URL('./src/', import.meta.url)),
			},
		],
	},
});
