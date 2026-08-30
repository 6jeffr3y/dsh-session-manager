<div align="center">

# DSH Session Manager

为 DeepSeek Harness Web 提供归档、恢复、标签、收藏、关系图和安全删除能力。

[![Release](https://img.shields.io/github/v/release/6jeffr3y/dsh-session-manager)](https://github.com/6jeffr3y/dsh-session-manager/releases)
[![License](https://img.shields.io/github/license/6jeffr3y/dsh-session-manager)](LICENSE)
[![DSH Plugin](https://img.shields.io/badge/DSH-plugin-4c7dff)](https://github.com/topics/dsh-plugin)

</div>

## 功能

- 归档、查看和恢复会话。
- 点击标题直接打开对应会话。
- 为会话添加多个标签，并按标签筛选。
- 收藏重要会话。
- 按完全相同的标签生成会话关系图；归档会话不参与关系图。
- 永久删除前进行二次确认，仅删除 Session 内容，不删除 MemOS、Agent 记忆、Skill 或插件配置。
- 自动加载当前会话的完整历史，使 DSH 原生过程折叠和右侧轮次导航保持完整。
- 改善非 DeepSeek 辅助模型生成会话标题时只有推理、没有自然标题的问题。

## 安装

要求已经安装 DeepSeek Harness，并使用 Node.js `^22.19.0 || >=24`。

从 GitHub Release 安装：

```sh
dsh plugin --profile web add github:6jeffr3y/dsh-session-manager#v0.1.0
```

重启 Web profile 后生效：

```sh
dsh web
```

更新到指定版本时重新执行 `add`；卸载使用：

```sh
dsh plugin --profile web remove dsh-plugin-session-manager
```

> GitHub 安装会直接使用仓库中随 Release 提交的 `lib/`，不运行安装期构建脚本。需要固定供应链内容时，可以把版本标签替换为具体 commit SHA。

## 使用

安装后，Web 左侧栏会出现“会话管理”入口：

1. 在“会话”视图中归档、收藏或添加标签。
2. 在“已归档”视图中恢复会话或永久删除会话。
3. 在“关系图”中查看相同标签与会话的连接。
4. 点击任意会话标题或关系图中的会话节点跳转到对应会话。

## 配置

插件默认配置位于 `cordis.patch.yml`：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `stateDir` | `''` | 插件状态目录；空值使用 `$DSH_HOME/session-manager` |
| `improveNonDeepSeekTitles` | `true` | 为标题任务关闭受支持模型的推理输出 |
| `autoLoadFullHistory` | `true` | 自动加载当前会话的更早历史页 |

## 删除安全

永久删除仅支持已经归档、当前未运行且使用独立 JSONL 制品的 Session。仍由 Host 挂载但已经停止的会话会进入待删除队列，在下次 DSH 启动、恢复该会话之前完成删除。正在生成回复的会话会被明确拒绝删除。

删除范围包括 Session JSONL、对应的投影缓存、Workspace 成员关系、归档记录以及本插件保存的标签和收藏。插件不会删除：

- MemOS 数据库或 `~/.dsh/memos-plugin/`
- Agent 记忆与 Skill
- 其他 Session
- 插件或模型配置
- 跨 Session 共享的附件对象

## 兼容性

当前版本针对 DeepSeek Harness `0.1.2-alpha.1` 开发和测试。DSH 仍处于预发布阶段；Workspace 或 Session 内部接口发生变化时，本插件会优先明确失败，而不是直接修改未知格式的数据。

## 本地开发

```sh
git clone https://github.com/6jeffr3y/dsh-session-manager.git
cd dsh-session-manager
npm install --ignore-scripts
npm run check
npm run pack:check
```

将本地 checkout 安装到 Web profile：

```sh
dsh plugin --profile web add link:$PWD
```

## License

[MIT](LICENSE)
