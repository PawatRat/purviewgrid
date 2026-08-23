---
license: openrail
datasets:
- deepghs/character_similarity
metrics:
- f1
pipeline_tag: zero-shot-image-classification
tags:
- art
base_model: deepghs/ccip
---

|                Model                |  F1 Score  |  Precision  |  Recall  |  Threshold  |  Cluster_2  |  Cluster_Free  |
|:-----------------------------------:|:----------:|:-----------:|:--------:|:-----------:|:-----------:|:--------------:|
|        ccip-caformer_b36-24         |  0.940925  |  0.938254   | 0.943612 |  0.213231   |   0.89508   |    0.957017    |
|   ccip-caformer-24-randaug-pruned   |  0.917211  |  0.933481   | 0.901499 |  0.178475   |  0.890366   |    0.922375    |
|       ccip-v2-caformer_s36-10       |  0.906422  |  0.932779   | 0.881513 |  0.207757   |  0.874592   |    0.89241     |
| ccip-caformer-6-randaug-pruned_fp32 |  0.878403  |  0.893648   | 0.863669 |  0.195122   |  0.810176   |    0.897904    |
|        ccip-caformer-5_fp32         |  0.864363  |   0.90155   | 0.830121 |  0.183973   |  0.792051   |    0.862289    |
|        ccip-caformer-4_fp32         |  0.844967  |  0.870553   | 0.820842 |   0.18367   |  0.795565   |    0.868133    |
|       ccip-caformer_query-12        |  0.823928  |  0.871122   | 0.781585 |  0.141308   |  0.787237   |    0.809426    |
|    ccip-caformer-23_randaug_fp32    |  0.81625   |  0.854134   | 0.781585 |  0.136797   |  0.745697   |     0.8068     |
| ccip-caformer-2-randaug-pruned_fp32 |  0.78561   |  0.800148   | 0.771592 |  0.171053   |  0.686617   |    0.728195    |
|        ccip-caformer-2_fp32         |  0.755125  |  0.790172   | 0.723055 |  0.141275   |   0.64977   |    0.718516    |

* The calculation of `F1 Score`, `Precision`, and `Recall` considers "the characters in both images are the same" as a positive case. `Threshold` is determined by finding the maximum value on the F1 Score curve.
* `Cluster_2` represents the approximate optimal clustering solution obtained by tuning the eps value in DBSCAN clustering algorithm with min_samples set to `2`, and evaluating the similarity between the obtained clusters and the true distribution using the `random_adjust_score`.
* `Cluster_Free` represents the approximate optimal solution obtained by tuning the `max_eps` and `min_samples` values in the OPTICS clustering algorithm, and evaluating the similarity between the obtained clusters and the true distribution using the `random_adjust_score`.