var yaml = require("js-yaml");
var fs = require("fs");
var contacts = [];
var e = yaml.load(fs.readFileSync("data/legislators-current.yaml"));
e.forEach(function(m)
  {
    var cur = m.terms[m.terms.length - 1];

    var name = m.name.official_full;
    var district = (cur.type == 'sen' ? "Senate" : cur.district);
    var phone = cur.phone;
    var fax = cur.fax;
    var contact = cur.contact_form;
    var state = cur.state;

    contacts.push({name: name, district: district, phone: phone, fax: fax, contact: contact, state: state});
  }
);

console.log(JSON.stringify(contacts));
