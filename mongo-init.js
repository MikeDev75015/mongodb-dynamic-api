db.getSiblingDB('dam-test').createUser({
  user: 'dam-user',
  pwd: 'dam-pass',
  roles: [
    {
      role: 'dbOwner',
      db: 'dam-test',
    },
  ],
});
