const { PrismaClient } = require('@prisma/client')
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')

const adapter = new PrismaBetterSqlite3({
  url: 'file:./prisma/dev.db',
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany()
  if (users.length === 0) {
    console.log('No users found.');
    return;
  }
  
  const targetUser = users[0];
  console.log(`Attempting to update user ${targetUser.email} (ID: ${targetUser.id})...`);
  
  try {
    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: { image: 'test-url' }
    });
    console.log('Update succeeded:', updated);
  } catch (err) {
    console.error('Update failed with error:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
