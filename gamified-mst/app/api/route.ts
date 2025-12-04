// import { writeFile, mkdir } from 'fs/promises';
// import path from 'path';

// // Will deal with saving the data later
// export async function POST(req: Request) {
//   const { filename, content } = await req.json();

//   const dir = path.join(process.cwd(), 'logs');
//   await mkdir(dir, { recursive: true });
//   await writeFile(path.join(dir, filename), content, 'utf-8');

//   return new Response(`Log file: ${filename}`, { status: 200 });
// }
