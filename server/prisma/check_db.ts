import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.word.count();
  const approvedCount = await prisma.word.count({ where: { isApproved: true } });
  const sample = await prisma.word.findMany({
    take: 10,
    where: { isApproved: true },
    select: { word: true, difficulty: true, category: true, isApproved: true }
  });

  console.log('=== DATABASE STATS ===');
  console.log(`Total words: ${count}`);
  console.log(`Approved words: ${approvedCount}`);
  console.log('\nSample words:');
  sample.forEach(w => console.log(`  - ${w.word} [${w.difficulty}] [${w.category}] approved:${w.isApproved}`));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
