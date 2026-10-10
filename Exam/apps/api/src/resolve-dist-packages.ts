import path from 'path';
import moduleAlias from 'module';

// When running compiled JavaScript, automatically resolve workspace packages from the emitted packages directory
try {
  if (__filename.includes('/dist/') || __filename.includes('\\dist\\') || !__filename.endsWith('.ts')) {
    const originalResolveFilename = (moduleAlias as any)._resolveFilename;
    if (originalResolveFilename) {
      const distIndex = __filename.lastIndexOf('/dist/');
      const distRoot = distIndex !== -1 ? __filename.substring(0, distIndex + 5) : path.resolve(__dirname, '../../..');
      const distPackagesDir = path.join(distRoot, 'packages');

      (moduleAlias as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
        if (request.startsWith('@repo/')) {
          const pkgName = request.substring(6);
          return path.join(distPackagesDir, pkgName, 'src', 'index.js');
        }
        return originalResolveFilename.call(this, request, parent, isMain, options);
      };
    }
  }
} catch (e) {
  // Fallback gracefully
}
