#!/bin/bash
protoc --ts_out=./dist/ \
  --proto_path=./protos \
  --ts_opt=no_namespace \
  --ts_opt=unary_rpc_promise=true \
  $(find ./protos -name "*.proto")

# Hack to add .ts extension to dependency imports, because node requires them
find ./dist -name "*.ts" -type f | while read file; do
  sed 's/from "\.\([^"]*\)"/from "\.\1.ts"/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Hack to import envelope.ts from @saflib/grpc
find ./dist -name "*.ts" -type f | while read file; do
  sed 's/".*envelope\.ts"/"@saflib\/grpc"/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Hack to skip typechecking for generated files
find ./dist -name "*.ts" -type f | while read file; do
  echo "// @ts-nocheck" > "$file.tmp" && cat "$file" >> "$file.tmp" && mv "$file.tmp" "$file"
done

rm -f ./dist/envelope.ts 