<div align="center">

# DSH Session Manager

面向 DeepSeek Harness Web 的会话治理插件：以标签组织 Session，管理归档生命周期，并让长对话折叠与轮次跳转保持完整。

[![Release](https://img.shields.io/github/v/release/6jeffr3y/dsh-session-manager)](https://github.com/6jeffr3y/dsh-session-manager/releases)
[![License](https://img.shields.io/github/license/6jeffr3y/dsh-session-manager)](LICENSE)
[![DSH Plugin](https://img.shields.io/badge/DSH-plugin-4c7dff)](https://github.com/topics/dsh-plugin)

</div>

## 核心优势

- **会话生命周期管理**：统一完成归档、归档视图、恢复、收藏和标题跳转，减少在长会话列表中的重复查找。
- **多标签组织**：为一个 Session 添加多个标签，复用已有标签，并按标题、路径或标签检索。
- **严格标签关系图**：仅以完全相同的标签建立“标签—会话”连接；归档和无标签会话不进入图谱，避免无依据的关系推断。
- **安全删除**：永久删除要求会话已经归档、停止运行并完成二次确认；仅清理 Session 内容和关联投影，不删除 MemOS、Agent 记忆、Skill 或模型配置。
- **完整长对话导航**：补全当前 Session 的历史窗口，使 DSH 原生 Compact 过程折叠、用户输入轮次标记和右侧 Turn Rail 基于完整轮次渲染。
- **多模型自然标题**：改善 GLM 等非 DeepSeek 辅助模型在标题 Token 预算内只输出推理、没有标题正文的问题；普通 Agent 请求不受影响。

## 界面预览

### 会话归档与标签管理

集中管理标签、收藏和归档状态。点击会话标题可直接跳转；归档会话可以恢复，符合删除条件后才能永久删除。

<p align="center">
  <img src="https://raw.githubusercontent.com/6jeffr3y/dsh-session-manager/main/docs/images/session-manager.png" alt="会话归档与标签管理" width="92%">
</p>

### 标签关系图

标签作为根节点连接包含该标签的未归档会话。图谱支持缩放、拖动画布、重置视图和点击会话节点跳转。

<p align="center">
  <img src="https://raw.githubusercontent.com/6jeffr3y/dsh-session-manager/main/docs/images/tag-relationship-graph.png" alt="按标签生成的会话关系图" width="92%">
</p>

### 长对话折叠与轮次导航

插件通过 DSH 公开的 `Session.loadOlder()` 串行加载当前会话的更早历史页。完整历史窗口让原生“工具调用 · 消息”过程区块稳定折叠，并使右侧用户输入轮次标记能够定位到对应输入。

<p align="center">
  <img src="https://raw.githubusercontent.com/6jeffr3y/dsh-session-manager/main/docs/images/long-conversation-navigation.png" alt="长对话过程折叠与右侧轮次导航" width="100%">
</p>

## 安装

要求已经安装 DeepSeek Harness，并使用 Node.js `^22.19.0 || >=24`。

```sh
dsh plugin --profile web add github:6jeffr3y/dsh-session-manager#v0.1.0
```

重启 Web profile 后生效：

```sh
dsh web
```

卸载插件：

```sh
dsh plugin --profile web remove dsh-plugin-session-manager
```

> GitHub 安装直接使用 Release 中提交的 `lib/`，不执行安装期构建脚本。需要固定供应链内容时，可以把版本标签替换为具体 commit SHA。

## 配置

默认配置位于 `cordis.patch.yml`：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `stateDir` | `''` | 插件状态目录；空值使用 `$DSH_HOME/session-manager` |
| `improveNonDeepSeekTitles` | `true` | 为支持该能力的标题模型关闭推理输出 |
| `autoLoadFullHistory` | `true` | 自动加载当前会话的更早历史页 |

## 数据与删除范围

永久删除仅支持已经归档、当前未运行且使用独立 JSONL 制品的 Session。仍由 Host 挂载但已经停止的会话会进入待删除队列，并在下次 DSH 启动、恢复该会话之前完成删除。正在生成回复的会话会被明确拒绝删除。

删除范围包括 Session JSONL、对应的投影缓存、Workspace 成员关系、归档记录以及本插件保存的标签和收藏。插件不会删除：

- MemOS 数据库或 `~/.dsh/memos-plugin/`
- Agent 记忆与 Skill
- 其他 Session
- 插件与模型配置
- 跨 Session 共享的附件对象

## 兼容性

当前版本针对 DeepSeek Harness `0.1.2-alpha.1` 开发和测试。DSH 仍处于预发布阶段；Workspace 或 Session 内部接口发生变化时，本插件会明确失败，不直接修改未知格式的数据。

## 本地开发

```sh
git clone https://github.com/6jeffr3y/dsh-session-manager.git
cd dsh-session-manager
npm install --ignore-scripts
npm run check
npm run pack:check
```

安装本地 checkout：

```sh
dsh plugin --profile web add link:$PWD
```

## License

[MIT](LICENSE)
