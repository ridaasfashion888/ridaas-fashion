import json, sqlite3, sys
db = sqlite3.connect(sys.argv[1])
db.row_factory = sqlite3.Row
request = json.load(sys.stdin)
try:
    result = []
    with db:
        for query in request:
            cursor = db.execute(query['sql'], query.get('params', []))
            rows = [dict(row) for row in cursor.fetchall()] if cursor.description else []
            changes = db.execute('SELECT changes()').fetchone()[0]
            result.append({'results': rows, 'meta': {'changes': changes, 'last_row_id': cursor.lastrowid}})
    print(json.dumps(result))
except Exception as error:
    print(json.dumps({'error': str(error)}))
    sys.exit(1)
