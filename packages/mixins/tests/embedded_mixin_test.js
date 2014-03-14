var get = Ember.get, set = Ember.set;
var HomePlanet, SuperVillain, EvilMinion, SecretLab, SecretWeapon, Comment,
    league, superVillain, evilMinion, secretWeapon, env;

module("mixins - EmbeddedMixin", {
  setup: function() {

    SuperVillain = DS.Model.extend({
      firstName:       DS.attr('string'),
      lastName:        DS.attr('string'),
      homePlanet:      DS.belongsTo("homePlanet"),
      secretLab:       DS.belongsTo("secretLab"),
      secretWeapons:   DS.hasMany("secretWeapon"),
      evilMinions:     DS.hasMany("evilMinion")
    });
    HomePlanet = DS.Model.extend({
      name:            DS.attr('string'),
      villains:        DS.hasMany('superVillain')
    });
    SecretLab = DS.Model.extend({
      minionCapacity:  DS.attr('number'),
      vicinity:        DS.attr('string'),
      superVillain:    DS.belongsTo('superVillain')
    });
    SecretWeapon = DS.Model.extend({
      name:            DS.attr('string'),
      superVillain:    DS.belongsTo('superVillain')
    });
    EvilMinion = DS.Model.extend({
      superVillain:    DS.belongsTo('superVillain'),
      name:            DS.attr('string')
    });
    Comment = DS.Model.extend({
      body:            DS.attr('string'),
      root:            DS.attr('boolean'),
      children:        DS.hasMany('comment')
    });
    env = setupStore({
      superVillain:    SuperVillain,
      homePlanet:      HomePlanet,
      secretLab:       SecretLab,
      secretWeapon:    SecretWeapon,
      evilMinion:      EvilMinion,
      comment:         Comment
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('secretLab');
    env.store.modelFor('secretWeapon');
    env.store.modelFor('evilMinion');
    env.store.modelFor('comment');
    env.container.register('serializer:application', DS.EmbeddedSerializer);
    env.container.register('serializer:embedded_json', DS.EmbeddedSerializer);
    env.container.register('adapter:embedded_json', DS.EmbeddedAdapter);
    env.embeddedSerializer = env.container.lookup("serializer:embedded_json");
    env.embeddedAdapter = env.container.lookup("adapter:embedded_json");
  },

  teardown: function() {
    Ember.run(function() {
      env.store.destroy();
    });
  }
});

test("extractSingle with embedded objects (hasMany relationship)", function() {
  env.container.register('adapter:superVillain', DS.EmbeddedAdapter);
  env.container.register('serializer:homePlanet', DS.EmbeddedSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");
  var json_hash = {
    home_planet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale"
      }]
    }
  };

  var json = serializer.extractSingle(env.store, HomePlanet, json_hash);

  deepEqual(json, {
    id: "1",
    name: "Umber",
    villains: ["1"]
  });
  env.store.find("superVillain", 1).then(async(function(minion) {
    equal(minion.get('firstName'), "Tom");
  }));
});

test("extractSingle with embedded objects inside embedded objects", function() {
  env.container.register('adapter:superVillain', DS.EmbeddedAdapter);
  env.container.register('serializer:homePlanet', DS.EmbeddedSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));
  env.container.register('serializer:superVillain', DS.EmbeddedSerializer.extend({
    attrs: {
      evilMinions: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");
  var json_hash = {
    home_planet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale",
        evil_minions: [{
          id: "1",
          name: "Alex"
        }]
      }]
    }
  };

  var json = serializer.extractSingle(env.store, HomePlanet, json_hash);

  deepEqual(json, {
    id: "1",
    name: "Umber",
    villains: ["1"]
  });
  env.store.find("superVillain", 1).then(async(function(villain) {
    equal(villain.get('firstName'), "Tom");
    equal(villain.get('evilMinions.length'), 1, "Should load the embedded child");
    equal(villain.get('evilMinions.firstObject.name'), "Alex", "Should load the embedded child");
  }));
  env.store.find("evilMinion", 1).then(async(function(minion) {
    equal(minion.get('name'), "Alex");
  }));
});

test("extractSingle with embedded objects of same type", function() {
  env.container.register('adapter:comment', DS.EmbeddedAdapter);
  env.container.register('serializer:comment', DS.EmbeddedSerializer.extend({
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:comment");
  var json_hash = {
    comment: {
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false
      },
      {
        id: "3",
        body: "Foo",
        root: false
      }]
    }
  };
  var json = serializer.extractSingle(env.store, Comment, json_hash);

  deepEqual(json, {
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }, "Primary record was correct");
  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary records found in the store");
});

test("extractSingle with embedded objects inside embedded objects of same type", function() {
  env.container.register('adapter:comment', DS.EmbeddedAdapter);
  env.container.register('serializer:comment', DS.EmbeddedSerializer.extend({
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:comment");
  var json_hash = {
    comment: {
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false,
        children: [{
          id: "4",
          body: "Another",
          root: false
        }]
      },
      {
        id: "3",
        body: "Foo",
        root: false
      }]
    }
  };
  var json = serializer.extractSingle(env.store, Comment, json_hash);

  deepEqual(json, {
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }, "Primary record was correct");
  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "4").get("body"), "Another", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "2").get("children.length"), 1, "Should have one embedded record");
  equal(env.store.recordForId("comment", "2").get("children.firstObject.body"), "Another", "Should have one embedded record");
});

test("extractSingle with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain')
  });

  env.container.register('adapter:home_planet', DS.EmbeddedAdapter);
  env.container.register('serializer:home_planet', DS.EmbeddedSerializer.extend({
    attrs: {
      villains: {embedded: 'always'},
      reformedVillains: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:home_planet");
  var json_hash = {
    home_planet: {
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        first_name: "Tom"
      }, {
        id: "3",
        first_name: "Yehuda"
      }],
      reformed_villains: [{
        id: "2",
        first_name: "Alex"
      },{
        id: "4",
        first_name: "Erik"
      }]
    }
  };
  var json = serializer.extractSingle(env.store, HomePlanet, json_hash);

  deepEqual(json, {
    id: "1",
    name: "Earth",
    villains: ["1", "3"],
    reformedVillains: ["2", "4"]
  }, "Primary array was correct");

  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "2").get("firstName"), "Alex", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "3").get("firstName"), "Yehuda", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "4").get("firstName"), "Erik", "Secondary records found in the store");
});

test("extractArray with embedded objects", function() {
  env.container.register('adapter:superVillain', DS.EmbeddedAdapter);
  env.container.register('serializer:homePlanet', DS.EmbeddedSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");

  var json_hash = {
    home_planets: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale"
      }]
    }]
  };

  var array = serializer.extractArray(env.store, HomePlanet, json_hash);

  deepEqual(array, [{
    id: "1",
    name: "Umber",
    villains: ["1"]
  }]);

  env.store.find("superVillain", 1).then(async(function(minion){
    equal(minion.get('firstName'), "Tom");
  }));
});

test("extractArray with embedded objects of same type as primary type", function() {
  env.container.register('adapter:comment', DS.EmbeddedAdapter);
  env.container.register('serializer:comment', DS.EmbeddedSerializer.extend({
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:comment");

  var json_hash = {
    comments: [{
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false
      },
      {
        id: "3",
        body: "Foo",
        root: false
      }]
    }]
  };

  var array = serializer.extractArray(env.store, Comment, json_hash);

  deepEqual(array, [{
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }], "Primary array is correct");

  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary record found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary record found in the store");
});

test("extractArray with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain')
  });

  env.container.register('adapter:homePlanet', DS.EmbeddedAdapter);
  env.container.register('serializer:homePlanet', DS.EmbeddedSerializer.extend({
    attrs: {
      villains: {embedded: 'always'},
      reformedVillains: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");
  var json_hash = {
    home_planets: [{
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        first_name: "Tom"
      },{
        id: "3",
        first_name: "Yehuda"
      }],
      reformed_villains: [{
        id: "2",
        first_name: "Alex"
      },{
        id: "4",
        first_name: "Erik"
      }]
    },{
      id: "2",
      name: "Mars",
      villains: [{
        id: "1",
        first_name: "Tom"
      },{
        id: "3",
        first_name: "Yehuda"
      }],
      reformed_villains: [{
        id: "5",
        first_name: "Peter"
      },{
        id: "6",
        first_name: "Trek"
      }]
    }]
  };
  var json = serializer.extractArray(env.store, HomePlanet, json_hash);

  deepEqual(json, [{
    id: "1",
    name: "Earth",
    villains: ["1", "3"],
    reformedVillains: ["2", "4"]
  },{
    id: "2",
    name: "Mars",
    villains: ["1", "3"],
    reformedVillains: ["5", "6"]
  }], "Primary array was correct");

  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "2").get("firstName"), "Alex", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "3").get("firstName"), "Yehuda", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "4").get("firstName"), "Erik", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "5").get("firstName"), "Peter", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "6").get("firstName"), "Trek", "Secondary records found in the store");
});

test("serialize with embedded objects (hasMany relationship)", function() {
  league = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
  var tom = env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", homePlanet: league, id: '1' });

  env.container.register('serializer:homePlanet', DS.EmbeddedSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));
  var serializer = env.container.lookup("serializer:homePlanet");

  var json = serializer.serialize(league);
  deepEqual(json, {
    name: "Villain League",
    villains: [{
      id: get(tom, "id"),
      first_name: "Tom",
      last_name: "Dale",
      home_planet_id: get(league, "id"),
      secret_lab_id: null
    }]
  });
});

test("serialize with (new) embedded objects (hasMany relationship)", function() {
  league = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
  superVillain = env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", homePlanet: league });

  env.container.register('serializer:homePlanet', DS.EmbeddedSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));
  var serializer = env.container.lookup("serializer:homePlanet");

  var json = serializer.serialize(league);
  deepEqual(json, {
    name: "Villain League",
    villains: [{
      first_name: "Tom",
      last_name: "Dale",
      home_planet_id: get(league, "id"),
      secret_lab_id: null
    }]
  });
});

test("serialize with embedded objects (hasMany relationships, including related objects not embedded)", function() {
  superVillain = env.store.createRecord(SuperVillain, { id: 1, firstName: "Super", lastName: "Villian" });
  evilMinion = env.store.createRecord(EvilMinion, { id: 1, name: "Evil Minion", superVillian: superVillain });
  secretWeapon = env.store.createRecord(SecretWeapon, { id: 1, name: "Secret Weapon", superVillain: superVillain });
  superVillain.get('evilMinions').pushObject(evilMinion);
  superVillain.get('secretWeapons').pushObject(secretWeapon);

  env.container.register('serializer:superVillain', DS.EmbeddedSerializer.extend({
    attrs: {
      evilMinions: {embedded: 'always'}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");

  var json = serializer.serialize(superVillain);
  deepEqual(json, {
    first_name: get(superVillain, "firstName"),
    last_name: get(superVillain, "lastName"),
    home_planet_id: null,
    evil_minions: [{
      id: get(evilMinion, "id"),
      name: get(evilMinion, "name"),
      super_villain_id: "1"
    }],
    secret_lab_id: null,
    secret_weapon_ids: [ "1" ]
  });
});

test("extractSingle with embedded object (belongsTo relationship)", function() {
  expect(4);
  env.container.register('adapter:superVillain', DS.EmbeddedAdapter);
  env.container.register('serializer:superVillain', DS.EmbeddedSerializer.extend({
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:superVillain");

  var json_hash = {
    super_villain: {
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      home_planet_id: "123",
      evil_minion_ids: ["1", "2", "3"],
      secret_lab: {
        minion_capacity: 5000,
        vicinity: "California, USA",
        id: "101"
      },
      secret_weapon_ids: []
    }
  };

  var json = serializer.extractSingle(env.store, SuperVillain, json_hash);

  deepEqual(json, {
    "id": "1",
    "firstName": "Tom",
    "lastName": "Dale",
    "homePlanet": "123",
    "evilMinions": ["1", "2", "3"],
    "secretLab": "101",
    "secretWeapons": []
  });

  env.store.find("secretLab", 101).then(async(function(secretLab) {
    equal(secretLab.get('id'), '101');
    equal(secretLab.get('minionCapacity'), 5000);
    equal(secretLab.get('vicinity'), 'California, USA');
  }));
});

test("serialize with embedded object (belongsTo relationship)", function() {
  env.container.register('adapter:superVillain', DS.EmbeddedAdapter);
  env.container.register('serializer:superVillain', DS.EmbeddedSerializer.extend({
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");

  // records with an id, persisted

  var tom = env.store.createRecord(
    SuperVillain,
    { firstName: "Tom", lastName: "Dale", id: "1",
      secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
      homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
    }
  );

  var json = serializer.serialize(tom);
  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab: {
      id: get(tom, "secretLab").get("id"),
      minion_capacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity")
    }
  });
});

test("serialize with embedded object (belongsTo relationship, new no id)", function() {
  env.container.register('adapter:superVillain', DS.EmbeddedAdapter);
  env.container.register('serializer:superVillain', DS.EmbeddedSerializer.extend({
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:superVillain");

  // records without ids, new

  var tom = env.store.createRecord(
    SuperVillain,
    { firstName: "Tom", lastName: "Dale",
      secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA" }),
      homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
    }
  );

  var json = serializer.serialize(tom);
  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab: {
      minion_capacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity")
    }
  });
});

test("when related record is not present, serialize embedded record (with a belongsTo relationship) as null", function() {
  env.container.register('adapter:superVillain', DS.EmbeddedAdapter);
  env.container.register('serializer:superVillain', DS.EmbeddedSerializer.extend({
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");

  var tom = env.store.createRecord(
    SuperVillain,
    { firstName: "Tom", lastName: "Dale", id: "1",
      homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
    }
  );

  var json = serializer.serialize(tom);
  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab: null
  });
});

test("extractSingle with multiply-nested belongsTo", function() {
  env.container.register('adapter:evilMinion', DS.EmbeddedAdapter);
  env.container.register('serializer:evilMinion', DS.EmbeddedSerializer.extend({
    attrs: {
      superVillain: {embedded: 'always'}
    }
  }));
  env.container.register('serializer:superVillain', DS.EmbeddedSerializer.extend({
    attrs: {
      homePlanet: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:evilMinion");
  var json_hash = {
    evil_minion: {
      id: "1",
      name: "Alex",
      super_villain: {
        id: "1",
        first_name: "Tom",
        last_name: "Dale",
        evil_minion_ids: ["1"],
        home_planet: {
          id: "1",
          name: "Umber",
          super_villain_ids: ["1"]
        }
      }
    }
  };
  var json = serializer.extractSingle(env.store, EvilMinion, json_hash);

  deepEqual(json, {
    id: "1",
    name: "Alex",
    superVillain: "1"
  }, "Primary array was correct");

  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary record, Tom, found in the steore");
  equal(env.store.recordForId("homePlanet", "1").get("name"), "Umber", "Nested Secondary record, Umber, found in the store");
});
