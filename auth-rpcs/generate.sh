#!/bin/bash
protoc --ts_out=./dist/ \
  --proto_path=./protos \
  --proto_path=../../saflib/grpc-specs/protos \
  --ts_opt=no_namespace \
  --ts_opt=unary_rpc_promise=true \
  protos/*.proto

# Hack to add .ts extension to dependency imports, because node requires them
for file in ./dist/*.ts; do
  sed 's/from "\.\([^"]*\)"/from "\.\1.ts"/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Hack to import envelope.ts from @saflib/grpc-specs
for file in ./dist/*.ts; do
  sed 's/\"\.\/envelope\.ts\"/\"@saflib\/grpc-specs\"/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

rm -f ./dist/envelope.ts 