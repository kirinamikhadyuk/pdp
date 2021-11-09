public with sharing class Tree {
    private TreeNode rootNode;

    public Tree() {
        rootNode = null;
    }

    public void insertNode(Integer value) {
        TreeNode node = new TreeNode(value);

        if (rootNode == null) {
            rootNode = node;
        } else {
            TreeNode currentNode = rootNode;
            TreeNode parentNode;

            while (true) {
                parentNode = currentNode;
                if (value == currentNode.getValue()) {
                    return;
                } else if (value < currentNode.getValue()) {
                    currentNode = currentNode.getLeftChild();
                    if (currentNode == null) {
                        parentNode.setLeftChild(node);
                        return;
                    }
                } else {
                    currentNode = currentNode.getRightChild();
                    if (currentNode == null) {
                        parentNode.setRightChild(node);
                        return;
                    }
                }
            }
        }
    }

    public Boolean deleteNode(Integer value) {
        TreeNode currentNode = rootNode;
        TreeNode parentNode = rootNode;
        Boolean isLeftChild = true;

        while (currentNode.getValue() != value) {
            parentNode = currentNode;

            if (value < currentNode.getValue()) {
                isLeftChild = true;
                currentNode = currentNode.getLeftChild();
            } else {
                isLeftChild = false;
                currentNode = currentNode.getRightChild();
            }

            if (currentNode == null) {
                return false;
            }
        }

        if (currentNode.getRightChild() == null && currentNode.getLeftChild() == null) {
            if (currentNode == rootNode) {
                rootNode = null;
            } else if (isLeftChild) {
                parentNode.setLeftChild(null);
            } else {
                parentNode.setRightChild(null);
            }
        } else if (currentNode.getRightChild() == null) {
            if (currentNode == rootNode) {
                rootNode = currentNode.getLeftChild();
            } else if (isLeftChild) {
                parentNode.setLeftChild(currentNode.getLeftChild());
            } else {
                parentNode.setRightChild(currentNode.getLeftChild());
            }
        } else if (currentNode.getLeftChild() == null) {
            if (currentNode == rootNode) {
                rootNode = currentNode.getRightChild();
            } else if (isLeftChild) {
                parentNode.setLeftChild(currentNode.getRightChild());
            } else {
                parentNode.setRightChild(currentNode.getRightChild());
            }
        } else {
            TreeNode inheritor = findInheritor(currentNode);

            if (currentNode == rootNode) {
                rootNode = inheritor;
            } else if (isLeftChild) {
                parentNode.setLeftChild(inheritor);
            } else {
                parentNode.setRightChild(inheritor);
            }
        }

        return true;
    }

    private TreeNode findInheritor(TreeNode node) {
        TreeNode parentNode = node;
        TreeNode inheritorNode = node;
        TreeNode currentNode = node.getRightChild();

        while (currentNode != null) {
            parentNode = inheritorNode;
            inheritorNode = currentNode;
            currentNode = currentNode.getLeftChild();
        }

        if (inheritorNode != node.getRightChild()) {
            parentNode.setLeftChild(inheritorNode.getRightChild());
            inheritorNode.setRightChild(node.getRightChild());
        }
        return inheritorNode;
    }

    public TreeNode findNodeByValue(Integer value) {
        TreeNode currenNode = rootNode;
        while (currenNode.getValue() != value) {
            if (value < currenNode.getValue()) {
                currenNode = currenNode.getLeftChild();
            } else {
                currenNode = currenNode.getRightChild();
            }

            if (currenNode == null) {
                return null;
            }
        }

        return currenNode;
    }

    public void printTree() {
        if (rootNode != null) {

            String result = '\n';

            List<TreeNode> nodesQueue = new List<TreeNode>();
            nodesQueue.add(rootNode);

            while (!nodesQueue.isEmpty()) {
                Integer nodesAtCurrentLevel = nodesQueue.size();
                while (nodesAtCurrentLevel > 0) {
                    TreeNode current = nodesQueue.get(0);
                    nodesQueue.remove(0);

                    result += current.getValue() + ' ';

                    if (current.getLeftChild() != null) {
                        nodesQueue.add(current.getLeftChild());
                    }

                    if (current.getRightChild() != null) {
                        nodesQueue.add(current.getRightChild());
                    }

                    nodesAtCurrentLevel--;
                }

                result += '\n';
            }

            System.debug(result);
        } else {
            System.debug('Tree not found');
        }
    }

    public void preOrder(TreeNode node) {
        if(node == null) return;

        System.debug(node.getValue());

        preOrder(node.getLeftChild());
        preOrder(node.getRightChild());
    }

    public void inOrder(TreeNode node) {
        if(node == null) return;

        inOrder(node.getLeftChild());

        System.debug(node.getValue());

        inOrder(node.getRightChild());
    }

    public void postOrder(TreeNode node) {
        if(node == null) return;

        postOrder(node.getLeftChild());
        postOrder(node.getRightChild());

        System.debug(node.getValue());
    }

    public void bfs(TreeNode node) {
        List<TreeNode> nodesQueue = new List<TreeNode>();
        nodesQueue.add(rootNode);

        while(!nodesQueue.isEmpty()) {
            Integer nodesAtCurrentLevel = nodesQueue.size();
            while (nodesAtCurrentLevel > 0) {
                TreeNode current = nodesQueue.get(0);
                nodesQueue.remove(0);

                System.debug(current.getValue());

                if (current.getLeftChild() != null) {
                    nodesQueue.add(current.getLeftChild());
                }

                if (current.getRightChild() != null) {
                    nodesQueue.add(current.getRightChild());
                }

                nodesAtCurrentLevel--;
            }
        }
    }
}