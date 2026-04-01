# QE Framework ドキュメント案内

QE Framework は Claude Code と Codex の両方を対象にしたスペック駆動タスク実行フレームワークです。

基本フロー:

```text
/Qplan -> /Qgs -> /Qatomic-run -> /Qcode-run-task
```

この文書は日本語のランディングページです。詳細は役割ごとに分割された文書を参照してください。

## まず読む文書

- プロジェクト概要: [../README.md](../README.md)
- 哲学と設計意図: [PHILOSOPHY.md](PHILOSOPHY.md)
- 詳細な使い方: [USAGE_GUIDE.md](USAGE_GUIDE.md)
- 文書マップ: [DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md)
- マルチモデル設定: [MULTI_MODEL_SETUP.md](MULTI_MODEL_SETUP.md)
- システム概要: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)

## 核心概念

- `single-model`
  - Claude のみを使う基本経路
  - `/Qatomic-run` は Haiku swarm ベースの atomic execution
- `hybrid`
  - 一部の役割だけ外部 runner を使う
- `multi-model`
  - planner / implementer / reviewer / supervisor を役割ごとに明示的に分離する
- `tiered-model`
  - 同じ provider の中で難易度に応じて上位・中位・下位モデルを分けて使う

## サブスクリプション構成ごとの推奨

| 利用可能なツール | 推奨モード | 推奨デフォルト割り当て |
|------------------|------------|------------------------|
| Claude のみ | `single-model` | Claude が全役割を担当 |
| Claude tiered | `tiered-model` | planner/supervisor = Opus、implementer/reviewer = Sonnet、軽量補助 = Haiku |
| Codex tiered | `tiered-model` | planner/supervisor = GPT-5.4、implementer/reviewer = GPT-5-Codex、軽量補助 = GPT-5-Codex-Mini |
| Claude + Codex | `hybrid` | implementer = Codex、その他 = Claude |
| Claude + Gemini | `hybrid` | reviewer = Gemini、その他 = Claude |
| Claude + Codex + Gemini | `multi-model` | planner/supervisor = Claude、implementer = Codex、reviewer = Gemini |

## クイックスタート

1. プラグインをインストール

```bash
claude plugin marketplace add inho-team/qe-framework
claude plugin install qe-framework@inho-team-qe-framework
```

インストール後は Codex ターゲットも同時に構成されます。

- `~/.codex/skills` に QE skill をコピー
- `~/.codex/agents` に QE agent をコピー
- `~/.codex/config.toml` に QE agent 設定ブロックを追加

2. プロジェクトを初期化

```text
/Qinit
```

Codex では次のように skill 名で呼び出せます。

```text
$Qinit
```

3. ワークフローを開始

```text
/Qplan
/Qgs
/Qatomic-run
/Qcode-run-task
```

## 参考

- quota 制限で runner が使えない場合は `--role-override` で一時的に再割り当てします。
- この override は現在の実行だけに適用され、`team-config.json` は書き換えません。
