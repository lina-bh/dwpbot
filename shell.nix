{ pkgs ? import <nixpkgs> {} }:

with pkgs;

mkShell {
  buildInputs = [ yarn nodejs-slim-10_x python ];
  shellHook = ''
    export JOBS="$(nproc)"
  '';
}
