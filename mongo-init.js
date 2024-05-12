db.getSiblingDB('dam-db').createUser({
  user: 'dam-user',
  pwd: 'dam-pass',
  roles: [
    {
      role: 'dbOwner',
      db: 'dam-db',
    },
  ],
});
