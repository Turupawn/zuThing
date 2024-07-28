use dep::std;

fn main(index : Field, left_leaf : Field, right_path : [Field; 1]) {
    let root = std::merkle::compute_merkle_root(left_leaf, index, right_path);
    std::println(root);
}