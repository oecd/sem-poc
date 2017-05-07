{ pkgs ? import <nixpkgs> {} }:

let
  python = pkgs.python35.withPackages (ps: [ps.click]);

in pkgs.buildEnv rec {
  name = "oecd-tools";
  paths = buildInputs;
  buildInputs = with pkgs; [
    saxonb trang xmlstarlet
    graphviz gnused haskellPackages.shake haskellPackages.pandoc
    python sassc nodePackages.typescript
  ];
}
